
var fs = require("fs"),
	ffmpeg= require("fluent-ffmpeg"),
	path = require("path"),
	mime = require("mime"),
	glob = require('glob'),
	charsetDetector = require("node-icu-charset-detector"),
	Iconv  = require('iconv').Iconv,
	util = require('util');

var chunkExtensions = ["MKV", "AVI", "MOV", "MP4", "OGG", "WEBM", "MPGA", "WAV", "MP3"]
var mediaExtensions = ["JPEG", "JPG", "GIF", "PNG"].concat(chunkExtensions);
var timeRegex = /[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}/g;

var bufferTime = 30; // seconds

// convert the SRT content to WebVTT
function getWebVTT(data) {

	var charset =	charsetDetector.detectCharset(data).toString();

	if (charset !== "utf8") {
		var charsetConverter = new Iconv(charset, "utf8");
		data = charsetConverter.convert(data).toString();
	}

	var resultData = "WEBVTT\n\n" + data;
	var resultData = resultData.replace(timeRegex, function (match) {
		return match.replace(",", ".");
	});

	return resultData;
}


function PathNodes(fNode, rootPath)
{
	if (!fNode)
	{
		console.log("using default FileNode root");
		fNode = FileNode('/', '/', rootPath);
	}

	var pNode = {
		current: fNode,
		parents: [],
		files: []
	};

	var relativeFolderPath = path.join(pNode.current.parentPath, pNode.current.name);
	var fullFilePath = path.join(rootPath, relativeFolderPath);

	console.log("->" + fullFilePath);

	var file = path.resolve(fullFilePath);

	var stats = fs.statSync(file);

	if (!stats) {
		console.log("Error reading Stats object from " + fullFilePath);
		return null;
	}

	if (stats.isDirectory()) {
		// generamos lista de archivos y carpetas contenidas por current

		var subFiles = fs.readdirSync(fullFilePath);

		for (var i in subFiles) {

			var f = FileNode(subFiles[i], relativeFolderPath, rootPath);

			if (f)
			{
				console.log("--->" + subFiles[i]);
				pNode.files.push(f);
			}
		}
	}

	// generamos lista de carpetas padres
	if (fNode.parentPath)
	{
		var folders = pNode.current.parentPath.split('/');

		if (folders.length > 0)
		{
			pNode.parents.push(FileNode('/', '/', rootPath));

			var tmpPath = "/";

			for (var i in folders)
			{
				var f = folders[i];

				if (f.length > 0)
				{
					var n = FileNode(f, tmpPath, rootPath);

					if (n)
						pNode.parents.push(n);

					tmpPath = path.join(tmpPath, f);
				}
			}
		}
	}

	return pNode;

}

function FileNode(name, parentPath, rootPath)
{
	var fNode = {
		name: name,
		type: 'file',
		parentPath: parentPath
	};

	var fullFilePath = path.join(rootPath, fNode.parentPath, fNode.name);

	var file = path.resolve(fullFilePath);

	var stats = fs.statSync(file);

	if (!stats) {
		console.log("Error reading Stats object from " + fullFilePath);
		return null;
	}

	if (!stats.isDirectory())
	{
		var contentType = mime.lookup(file);
		var extension = mime.extension(contentType).toUpperCase();

		if (mediaExtensions.indexOf(extension) !== -1)
		{
			var baseName = path.basename(fNode.name, path.extname(fNode.name));
			fNode.extension = extension;
			fNode.contentType = contentType;

			// TODO verificar si hay un archivo SRT en la mismca carpeta
			if (chunkExtensions.indexOf(extension) !== -1)
			{
				var subtitle = findSubtitle(path.join(rootPath, fNode.parentPath), baseName);

				if (subtitle) {
					fNode.subtitle = path.basename(subtitle);
				}
			}
		}
		else
		{
			console.log("Extension de archivo no soportada (" + fullFilePath + ")");
			return null;
		}
	}
	else
	{
		fNode.type = 'folder';
	}

	return fNode;
}

function findSubtitle(rootPath, baseName){

    if (!fs.existsSync(rootPath)){
        console.log("no dir ",rootPath);
        return;
    }

		console.log("finding subtitles for " + path.join(rootPath, baseName));

    var files = fs.readdirSync(rootPath);

		console.log("files to review : " + files.length);

    for(var i = 0; i < files.length; i++){

				console.log("checking file " + files[i]);

        var fullFilePath = path.join(rootPath, files[i]);
				console.log("fullPath: " + fullFilePath);

				var file = path.resolve(fullFilePath);
				var stat = fs.statSync(file);

				var bName = path.basename(files[i], path.extname(files[i]));

				console.log("baseName: " + baseName);

        if (!stat.isDirectory() && baseName === bName && path.extname(files[i]).toUpperCase() === ".SRT") {
            return files[i];
        }
    };

		console.log("subtitle not found");
};

module.exports = function (rootPath) {
	return {
		getFiles: function (req, res) {

			if (!req.is('application/json')) {
				res.status(500).send({ error: 'invalid request content' });
				return;
			}

			var queryNode = (req.body && req.body.name && req.body.parentPath) ? new FileNode(req.body.name, req.body.parentPath, rootPath) : null;
			var result = PathNodes(queryNode, rootPath);

			console.log(JSON.stringify(result));

			if (!result)
				res.status(404).send({ error: "Path not found" });

				res.json(result);
		},

		getContent: function (req, res) {

			var parent = req.query.parent;
			parent = parent === undefined || parent === null ? "" : parent;
			var filename = req.query.filename;

			if (!filename) {
				res.status(500).send({ error: "invalid params" });
				return;
			}

			var fullPath = path.join(rootPath, parent, filename);
			var file = path.resolve(fullPath);

			console.log(fullPath);

			var contentType = mime.lookup(file);
			var extension = mime.extension(contentType).toUpperCase();

			console.log("content type: " + contentType);
			console.log("extension file: " + extension);

			if (chunkExtensions.indexOf(extension) !== -1 && req.headers.range !== undefined) {
				
				console.log(util.inspect(req.headers, false, null));

				var range = req.headers.range;
				var positions = range.replace(/bytes=/, "").split("-");
				var start = parseInt(positions[0], 10);

				fs.stat(file, function(err, stats) {
					if (err) {
						console.log("ERROR: " + err);
						res.status(404).send({ error: "File not found" });
						return;
					} else {
						var total = stats.size;
						var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
						var chunksize = (end - start) + 1;

						res.writeHead(206, {
							"Content-Range": "bytes " + start + "-" + end + "/" + total,
							"Accept-Ranges": "bytes",
							"Content-Length": chunksize,
							"Content-Type": contentType
						});

						var stream = fs.createReadStream(file, { start: start, end: end })
							.on("open", function() {
								stream.pipe(res);
							}).on("error", function(err) {
								res.end(err);
							});
						/*
						// make sure you set the correct path to your video file
						ffmpeg.ffprobe(fullPath, function(err, metadata) {
							//console.log(util.inspect(metadata, false, null));
							
							if (!metadata)
								return;
							
							var videoStream = null;
							
							if (metadata.streams && metadata.streams.length > 0) {
								for(var index in metadata.streams) {
									if (metadata.streams[index].codec_type === "video") {
										videoStream = metadata.streams[index];
										break;
									}
								}
							}
							
							if (videoStream == null)
								return;
								
							console.log("duration: " + videoStream.duration);
							
							var total = Math.floor(videoStream.duration);
							var end = (start + bufferTime) > total ? total : (start + bufferTime);// positions[1] ? parseInt(positions[1], 10) : total - 1;
							var chunksize = (end - start) + 1;
							
							res.contentType('mp4');
							
							console.log("ffmpeg command ...");
							
							var buffer = "";
							
							var command = ffmpeg(file)
								.format("mp4")
								.videoCodec("libx264")
								.outputOptions('-movflags frag_keyframe+empty_moov')
								.audioCodec('aac')
								.seekInput(start)
								.duration((end - start) + 1)
								.on('error', function(err, stdout, stderr) {
									  console.log(err.message); //this will likely return "code=1" not really useful
									  console.log("stdout:\n" + stdout);
									  console.log("stderr:\n" + stderr); //this will contain more detailed debugging info
								 })
								.on('end', function() {
									console.log('Finished processing');
									 
									res.writeHead(206, {
										"Content-Range": "seconds " + start + "-" + end + "/" + total,
										"Accept-Ranges": "seconds",
										"Content-Length": buffer.length,
										"Content-Type": contentType
									});
									 
									res.end(buffer);
								});
							
							var ffstream = command.pipe();
								
							ffstream.on('data', function(chunk) {
								
								console.log('ffmpeg just wrote ' + chunk.length + ' bytes');
								//console.log('chunk data: ' + chunk);
								
								if (!buffer)
									buffer = chunk;
								else
									buffer += chunk;
							});
							
								
							
							
						});*/
							/*
						res.contentType('mp4');
							
						var ffstream = ffmpeg(file)
							.format("mp4")
							.videoCodec("libx264")
							.outputOptions('-movflags frag_keyframe+empty_moov')
							.audioCodec('aac')
							//.noAudio()
							//.audioChannels(1)
							//.outputOptions('-movflags frag_keyframe+empty_moov')
							.on('error', function(err, stdout, stderr) {
								  console.log(err.message); //this will likely return "code=1" not really useful
								  console.log("stdout:\n" + stdout);
								  console.log("stderr:\n" + stderr); //this will contain more detailed debugging info
							 })
							.on('end', function() {
								 console.log('Finished processing');
							})
							.pipe(res, {end: true});*/
					}
				});
			} else {
				fs.readFile(fullPath, function (err, data) {
					if (err) {
						console.log("ERROR: " + err);
						res.status(404).send({ error: "File not found" });
						return;
					} else {

						if (extension === "SRT") {
							console.log("Is a SRT file");
							contentType = "text/vtt";
							data = getWebVTT(data);
						}

						res.writeHead(200, {
							"Content-Type": contentType
						});
						res.write(data);
						res.end();
					}
				});

			}
		}
	};
};
