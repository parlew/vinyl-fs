'use strict';

var path = require('path');

var pumpify = require('pumpify');
var through2 = require('through2');
var sourcemaps = require('gulp-sourcemaps');
var duplexify = require('duplexify');
var valueOrFunction = require('value-or-function');
var prepare = require('vinyl-prepare');

var fo = require('../file-operations');
var sink = require('../sink');
var writeContents = require('./write-contents');

var number = valueOrFunction.number;

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  var sourcemapsOpt = valueOrFunction(
      ['boolean', 'string', 'object'], opt.sourcemaps);

  function saveFile(file, enc, callback) {
    var dirMode = number(opt.dirMode, file);
    var writeFolder = path.dirname(file.path);

    fo.mkdirp(writeFolder, dirMode, onMkdirp);

    function onMkdirp(mkdirpErr) {
      if (mkdirpErr) {
        return callback(mkdirpErr);
      }
      writeContents(file, callback);
    }
  }

  var saveStream = pumpify.obj(
    prepare.write(outFolder, opt),
    through2.obj(opt, saveFile)
  );
  if (!sourcemapsOpt) {
    // Sink the save stream to start flowing
    // Do this on nextTick, it will flow at slowest speed of piped streams
    process.nextTick(sink(saveStream));

    return saveStream;
  }

  if (typeof sourcemapsOpt === 'boolean') {
    sourcemapsOpt = {};
  } else if (typeof sourcemapsOpt === 'string') {
    sourcemapsOpt = {
      path: sourcemapsOpt,
    };
  }

  var mapStream = sourcemaps.write(sourcemapsOpt.path, sourcemapsOpt);
  var outputStream = duplexify.obj(mapStream, saveStream);
  mapStream.pipe(saveStream);

  // Sink the output stream to start flowing
  // Do this on nextTick, it will flow at slowest speed of piped streams
  process.nextTick(sink(outputStream));

  return outputStream;
}

module.exports = dest;
