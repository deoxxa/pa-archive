//
// `_parse` does all the parsing work. It takes a buffer as an argument and
// returns an object as the result. The returned object looks like this:
//
// ```javascript
// {
//   table: [
//     {size: 5, offset: 0},
//     {size: 12, offset: 5},
//     {size: 4, offset: 17},
//   ],
//   objects: [
//     Buffer("..."),
//     Buffer("..."),
//     Buffer("..."),
//   ],
// }
// ```
//
var _parse = function _parse(buffer) {
  var offset = 0;

  var data_size = buffer.readUInt32LE(offset); offset += 4;
  var table_length = buffer.readUInt32LE(offset); offset += 4;

  var table = [];
  for (var i=0;i<table_length;++i) {
    var entry = {size: 0, offset: 0};
    entry.size = buffer.readUInt32LE(offset); offset += 4;
    entry.offset = buffer.readUInt32LE(offset); offset += 4;
    table.push(entry);
  }

  var objects = [];
  for (var i=0;i<table_length;++i) {
    if (table[i].offset === 0 && table[i].size === 0) {
      objects.push(null);
    } else {
      objects.push(buffer.slice(table[i].offset, table[i].offset + table[i].size));
    }
  }

  return {
    table: table,
    objects: objects,
  };
};

//
// `parse` is a wrapper for `_parse` to provide asynchronous behaviour.
//
exports.parse = function parse(buffer, cb) {
  if (cb === null) {
    return _parse(buffer);
  } else {
    process.nextTick(function() {
      try {
        return cb(null, _parse(buffer));
      } catch (e) {
        return cb(e);
      }
    });
  }
};

//
// `_create` does all the work creating archives. It takes an array of buffers
// as an argument and returns a single buffer as the result.
//
var _create = function _create(objects) {
  var len = 8 + objects.length * 8 + objects.reduce(function(i, v) { return i + (v ? v.length : 0); }, 0);

  var res = new Buffer(len);

  var offset = 0;

  res.writeUInt32LE(offset, len); offset += 4;
  res.writeUInt32LE(offset, objects.length); offset += 4;

  var o = 0;
  for (var i=0;i<objects.length;++i) {
    var l = objects[i] ? objects[i].length : 0;

    res.writeUInt32LE(l, offset); offset += 4;
    res.writeUInt32LE(o, offset); offset += 4;

    o += l;
  }

  for (var i=0;i<objects.length;++i) {
    if (objects[i]) {
      objects[i].copy(res, offset);
      offset += objects[i].length;
    }
  }

  return res;
};

//
// `create` is like `parse` in that it wraps the method that does the actual
// work and just provides asychronous behaviour.
//
exports.create = function create(objects, cb) {
  if (cb === null) {
    return _create(objects);
  } else {
    process.nextTick(function() {
      try {
        return cb(null, _create(objects));
      } catch (e) {
        return cb(e);
      }
    });
  }
};
