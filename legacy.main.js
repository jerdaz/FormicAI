'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
var encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
var decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};

var base64 = {
	encode: encode,
	decode: decode
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */



// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
var encode$1 = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
var decode$1 = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};

var base64Vlq = {
	encode: encode$1,
	decode: decode$1
};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var util = createCommonjsModule(function (module, exports) {
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port;
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}
exports.parseSourceMapInput = parseSourceMapInput;

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  sourceURL = sourceURL || '';

  if (sourceRoot) {
    // This follows what Chrome does.
    if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
      sourceRoot += '/';
    }
    // The spec says:
    //   Line 4: An optional source root, useful for relocating source
    //   files on a server or removing repeated values in the
    //   “sources” entry.  This value is prepended to the individual
    //   entries in the “source” field.
    sourceURL = sourceRoot + sourceURL;
  }

  // Historically, SourceMapConsumer did not take the sourceMapURL as
  // a parameter.  This mode is still somewhat supported, which is why
  // this code block is conditional.  However, it's preferable to pass
  // the source map URL to SourceMapConsumer, so that this function
  // can implement the source URL resolution algorithm as outlined in
  // the spec.  This block is basically the equivalent of:
  //    new URL(sourceURL, sourceMapURL).toString()
  // ... except it avoids using URL, which wasn't available in the
  // older releases of node still supported by this library.
  //
  // The spec says:
  //   If the sources are not absolute URLs after prepending of the
  //   “sourceRoot”, the sources are resolved relative to the
  //   SourceMap (like resolving script src in a html document).
  if (sourceMapURL) {
    var parsed = urlParse(sourceMapURL);
    if (!parsed) {
      throw new Error("sourceMapURL could not be parsed");
    }
    if (parsed.path) {
      // Strip the last path component, but keep the "/".
      var index = parsed.path.lastIndexOf('/');
      if (index >= 0) {
        parsed.path = parsed.path.substring(0, index + 1);
      }
    }
    sourceURL = join(urlGenerate(parsed), sourceURL);
  }

  return normalize(sourceURL);
}
exports.computeSourceURL = computeSourceURL;
});
var util_1 = util.getArg;
var util_2 = util.urlParse;
var util_3 = util.urlGenerate;
var util_4 = util.normalize;
var util_5 = util.join;
var util_6 = util.isAbsolute;
var util_7 = util.relative;
var util_8 = util.toSetString;
var util_9 = util.fromSetString;
var util_10 = util.compareByOriginalPositions;
var util_11 = util.compareByGeneratedPositionsDeflated;
var util_12 = util.compareByGeneratedPositionsInflated;
var util_13 = util.parseSourceMapInput;
var util_14 = util.computeSourceURL;

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */


var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = hasNativeMap ? new Map() : Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
  var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    if (hasNativeMap) {
      this._set.set(aStr, idx);
    } else {
      this._set[sStr] = idx;
    }
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
  } else {
    var sStr = util.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }

  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

var ArraySet_1 = ArraySet;

var arraySet = {
	ArraySet: ArraySet_1
};

var binarySearch = createCommonjsModule(function (module, exports) {
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};
});
var binarySearch_1 = binarySearch.GREATEST_LOWER_BOUND;
var binarySearch_2 = binarySearch.LEAST_UPPER_BOUND;
var binarySearch_3 = binarySearch.search;

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
var quickSort_1 = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};

var quickSort = {
	quickSort: quickSort_1
};

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */



var ArraySet$2 = arraySet.ArraySet;

var quickSort$1 = quickSort.quickSort;

function SourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
    : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
}

SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
};

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  configurable: true,
  enumerable: true,
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number is 1-based.
 *   - column: Optional. the column number in the original source.
 *    The column number is 0-based.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *    line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *    The column number is 0-based.
 */
SourceMapConsumer.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util.getArg(aArgs, 'column', 0)
    };

    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

var SourceMapConsumer_1 = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The first parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  var version = util.getArg(sourceMap, 'version');
  var sources = util.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util.getArg(sourceMap, 'names', []);
  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util.getArg(sourceMap, 'mappings');
  var file = util.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  if (sourceRoot) {
    sourceRoot = util.normalize(sourceRoot);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
        ? util.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet$2.fromArray(names.map(String), true);
  this._sources = ArraySet$2.fromArray(sources, true);

  this._absoluteSources = this._sources.toArray().map(function (s) {
    return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

/**
 * Utility function to find the index of a source.  Returns -1 if not
 * found.
 */
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util.relative(this.sourceRoot, relativeSource);
  }

  if (this._sources.has(relativeSource)) {
    return this._sources.indexOf(relativeSource);
  }

  // Maybe aSource is an absolute URL as returned by |sources|.  In
  // this case we can't simply undo the transform.
  var i;
  for (i = 0; i < this._absoluteSources.length; ++i) {
    if (this._absoluteSources[i] == aSource) {
      return i;
    }
  }

  return -1;
};

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @param String aSourceMapURL
 *        The URL at which the source map can be found (optional)
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet$2.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet$2.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function (s) {
      return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort$1(smc.__originalMappings, util.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._absoluteSources.slice();
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64Vlq.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort$1(generatedMappings, util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort$1(originalMappings, util.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util.compareByGeneratedPositionsDeflated,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }

    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util.relative(this.sourceRoot, relativeSource);
    }

    var url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util.getArg(aArgs, 'source');
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }

    var needle = {
      source: source,
      originalLine: util.getArg(aArgs, 'line'),
      originalColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util.compareByOriginalPositions,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

var BasicSourceMapConsumer_1 = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The first parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * The second parameter, if given, is a string whose value is the URL
 * at which the source map was found.  This URL is used to compute the
 * sources array.
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = util.parseSourceMapInput(aSourceMap);
  }

  var version = util.getArg(sourceMap, 'version');
  var sections = util.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet$2();
  this._names = new ArraySet$2();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util.getArg(s, 'offset');
    var offsetLine = util.getArg(offset, 'line');
    var offsetColumn = util.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util.getArg(s, 'map'), aSourceMapURL)
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.  The line number
 *     is 1-based.
 *   - column: The column number in the generated source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.  The
 *     line number is 1-based.
 *   - column: The column number in the original source, or null.  The
 *     column number is 0-based.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.  The line number
 *     is 1-based.
 *   - column: The column number in the original source.  The column
 *     number is 0-based.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.  The
 *     line number is 1-based. 
 *   - column: The column number in the generated source, or null.
 *     The column number is 0-based.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer._findSourceIndex(util.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort$1(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
    quickSort$1(this.__originalMappings, util.compareByOriginalPositions);
  };

var IndexedSourceMapConsumer_1 = IndexedSourceMapConsumer;

var sourceMapConsumer = {
	SourceMapConsumer: SourceMapConsumer_1,
	BasicSourceMapConsumer: BasicSourceMapConsumer_1,
	IndexedSourceMapConsumer: IndexedSourceMapConsumer_1
};

var SourceMapConsumer$1 = sourceMapConsumer.SourceMapConsumer;

// tslint:disable:no-conditional-assignment
class ErrorMapper {
    static get consumer() {
        if (this._consumer == null) {
            this._consumer = new SourceMapConsumer$1(require("main.js.map"));
        }
        return this._consumer;
    }
    /**
     * Generates a stack trace using a source map generate original symbol names.
     *
     * WARNING - EXTREMELY high CPU cost for first call after reset - >30 CPU! Use sparingly!
     * (Consecutive calls after a reset are more reasonable, ~0.1 CPU/ea)
     *
     * @param {Error | string} error The error or original stack trace
     * @returns {string} The source-mapped stack trace
     */
    static sourceMappedStackTrace(error) {
        const stack = error instanceof Error ? error.stack : error;
        if (this.cache.hasOwnProperty(stack)) {
            return this.cache[stack];
        }
        const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm;
        let match;
        let outStack = error.toString();
        while (match = re.exec(stack)) {
            if (match[2] === "main") {
                const pos = this.consumer.originalPositionFor({
                    column: parseInt(match[4], 10),
                    line: parseInt(match[3], 10)
                });
                if (pos.line != null) {
                    if (pos.name) {
                        outStack += `\n    at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`;
                    }
                    else {
                        if (match[1]) {
                            // no original source file name known - use file name from given trace
                            outStack += `\n    at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`;
                        }
                        else {
                            // no original source file name known or in given trace - omit name
                            outStack += `\n    at ${pos.source}:${pos.line}:${pos.column}`;
                        }
                    }
                }
                else {
                    // no known position
                    break;
                }
            }
            else {
                // no more parseable lines
                break;
            }
        }
        this.cache[stack] = outStack;
        return outStack;
    }
    static wrapLoop(loop) {
        return () => {
            try {
                loop();
            }
            catch (e) {
                if (e instanceof Error) {
                    if ("sim" in Game.rooms) {
                        const message = `Source maps don't work in the simulator - displaying original error`;
                        console.log(`<span style='color:red'>${message}<br>${_.escape(e.stack)}</span>`);
                        Game.notify(_.escape(e.stack), 30);
                    }
                    else {
                        console.log(`<span style='color:red'>${_.escape(this.sourceMappedStackTrace(e))}</span>`);
                        Game.notify(_.escape(this.sourceMappedStackTrace(e)), 30);
                    }
                }
                else {
                    // can't handle it
                    throw e;
                }
                throw e;
            }
        };
    }
}
// Cache previously mapped traces to improve performance
ErrorMapper.cache = {};

let usedOnStart = 0;
let enabled = false;
let depth = 0;

function AlreadyWrappedError() {
  this.name = 'AlreadyWrappedError';
  this.message = 'Error attempted to double wrap a function.';
  this.stack = ((new Error())).stack;
}

function setupProfiler() {
  depth = 0; // reset depth, this needs to be done each tick.
  Game.profiler = {
    stream(duration, filter) {
      setupMemory('stream', duration || 10, filter);
    },
    email(duration, filter) {
      setupMemory('email', duration || 100, filter);
    },
    profile(duration, filter) {
      setupMemory('profile', duration || 100, filter);
    },
    background(filter) {
      setupMemory('background', false, filter);
    },
    restart() {
      if (Profiler.isProfiling()) {
        const filter = Memory.profiler.filter;
        let duration = false;
        if (!!Memory.profiler.disableTick) {
          // Calculate the original duration, profile is enabled on the tick after the first call,
          // so add 1.
          duration = Memory.profiler.disableTick - Memory.profiler.enabledTick + 1;
        }
        const type = Memory.profiler.type;
        setupMemory(type, duration, filter);
      }
    },
    reset: resetMemory,
    output: Profiler.output,
  };

  overloadCPUCalc();
}

function setupMemory(profileType, duration, filter) {
  resetMemory();
  const disableTick = Number.isInteger(duration) ? Game.time + duration : false;
  if (!Memory.profiler) {
    Memory.profiler = {
      map: {},
      totalTime: 0,
      enabledTick: Game.time + 1,
      disableTick,
      type: profileType,
      filter,
    };
  }
}

function resetMemory() {
  Memory.profiler = null;
}

function overloadCPUCalc() {
  if (Game.rooms.sim) {
    usedOnStart = 0; // This needs to be reset, but only in the sim.
    Game.cpu.getUsed = function getUsed() {
      return performance.now() - usedOnStart;
    };
  }
}

function getFilter() {
  return Memory.profiler.filter;
}

const functionBlackList = [
  'getUsed', // Let's avoid wrapping this... may lead to recursion issues and should be inexpensive.
  'constructor', // es6 class constructors need to be called with `new`
];

function wrapFunction(name, originalFunction) {
  if (originalFunction.profilerWrapped) { throw new AlreadyWrappedError(); }
  function wrappedFunction() {
    if (Profiler.isProfiling()) {
      const nameMatchesFilter = name === getFilter();
      const start = Game.cpu.getUsed();
      if (nameMatchesFilter) {
        depth++;
      }
      const result = originalFunction.apply(this, arguments);
      if (depth > 0 || !getFilter()) {
        const end = Game.cpu.getUsed();
        Profiler.record(name, end - start);
      }
      if (nameMatchesFilter) {
        depth--;
      }
      return result;
    }

    return originalFunction.apply(this, arguments);
  }

  wrappedFunction.profilerWrapped = true;
  wrappedFunction.toString = () =>
    `// screeps-profiler wrapped function:\n${originalFunction.toString()}`;

  return wrappedFunction;
}

function hookUpPrototypes() {
  Profiler.prototypes.forEach(proto => {
    profileObjectFunctions(proto.val, proto.name);
  });
}

function profileObjectFunctions(object, label) {
  const objectToWrap = object.prototype ? object.prototype : object;

  Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
    const extendedLabel = `${label}.${functionName}`;

    const isBlackListed = functionBlackList.indexOf(functionName) !== -1;
    if (isBlackListed) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, functionName);
    if (!descriptor) {
      return;
    }

    const hasAccessor = descriptor.get || descriptor.set;
    if (hasAccessor) {
      const configurable = descriptor.configurable;
      if (!configurable) {
        return;
      }

      const profileDescriptor = {};

      if (descriptor.get) {
        const extendedLabelGet = `${extendedLabel}:get`;
        profileDescriptor.get = profileFunction(descriptor.get, extendedLabelGet);
      }

      if (descriptor.set) {
        const extendedLabelSet = `${extendedLabel}:set`;
        profileDescriptor.set = profileFunction(descriptor.set, extendedLabelSet);
      }

      Object.defineProperty(objectToWrap, functionName, profileDescriptor);
      return;
    }

    const isFunction = typeof descriptor.value === 'function';
    if (!isFunction) {
      return;
    }
    const originalFunction = objectToWrap[functionName];
    objectToWrap[functionName] = profileFunction(originalFunction, extendedLabel);
  });

  return objectToWrap;
}

function profileFunction(fn, functionName) {
  const fnName = functionName || fn.name;
  if (!fnName) {
    console.log('Couldn\'t find a function name for - ', fn);
    console.log('Will not profile this function.');
    return fn;
  }

  return wrapFunction(fnName, fn);
}

const Profiler = {
  printProfile() {
    console.log(Profiler.output());
  },

  emailProfile() {
    Game.notify(Profiler.output(1000));
  },

  output(passedOutputLengthLimit) {
    const outputLengthLimit = passedOutputLengthLimit || 1000;
    if (!Memory.profiler || !Memory.profiler.enabledTick) {
      return 'Profiler not active.';
    }

    const endTick = Math.min(Memory.profiler.disableTick || Game.time, Game.time);
    const startTick = Memory.profiler.enabledTick + 1;
    const elapsedTicks = endTick - startTick;
    const header = 'calls\t\ttime\t\tavg\t\tfunction';
    const footer = [
      `Avg: ${(Memory.profiler.totalTime / elapsedTicks).toFixed(2)}`,
      `Total: ${Memory.profiler.totalTime.toFixed(2)}`,
      `Ticks: ${elapsedTicks}`,
    ].join('\t');

    const lines = [header];
    let currentLength = header.length + 1 + footer.length;
    const allLines = Profiler.lines();
    let done = false;
    while (!done && allLines.length) {
      const line = allLines.shift();
      // each line added adds the line length plus a new line character.
      if (currentLength + line.length + 1 < outputLengthLimit) {
        lines.push(line);
        currentLength += line.length + 1;
      } else {
        done = true;
      }
    }
    lines.push(footer);
    return lines.join('\n');
  },

  lines() {
    const stats = Object.keys(Memory.profiler.map).map(functionName => {
      const functionCalls = Memory.profiler.map[functionName];
      return {
        name: functionName,
        calls: functionCalls.calls,
        totalTime: functionCalls.time,
        averageTime: functionCalls.time / functionCalls.calls,
      };
    }).sort((val1, val2) => {
      return val2.totalTime - val1.totalTime;
    });

    const lines = stats.map(data => {
      return [
        data.calls,
        data.totalTime.toFixed(1),
        data.averageTime.toFixed(3),
        data.name,
      ].join('\t\t');
    });

    return lines;
  },

  prototypes: [
    { name: 'Game', val: Game },
    { name: 'Room', val: Room },
    { name: 'Structure', val: Structure },
    { name: 'Spawn', val: Spawn },
    { name: 'Creep', val: Creep },
    { name: 'RoomPosition', val: RoomPosition },
    { name: 'Source', val: Source },
    { name: 'Flag', val: Flag },
  ],

  record(functionName, time) {
    if (!Memory.profiler.map[functionName]) {
      Memory.profiler.map[functionName] = {
        time: 0,
        calls: 0,
      };
    }
    Memory.profiler.map[functionName].calls++;
    Memory.profiler.map[functionName].time += time;
  },

  endTick() {
    if (Game.time >= Memory.profiler.enabledTick) {
      const cpuUsed = Game.cpu.getUsed();
      Memory.profiler.totalTime += cpuUsed;
      Profiler.report();
    }
  },

  report() {
    if (Profiler.shouldPrint()) {
      Profiler.printProfile();
    } else if (Profiler.shouldEmail()) {
      Profiler.emailProfile();
    }
  },

  isProfiling() {
    if (!enabled || !Memory.profiler) {
      return false;
    }
    return !Memory.profiler.disableTick || Game.time <= Memory.profiler.disableTick;
  },

  type() {
    return Memory.profiler.type;
  },

  shouldPrint() {
    const streaming = Profiler.type() === 'stream';
    const profiling = Profiler.type() === 'profile';
    const onEndingTick = Memory.profiler.disableTick === Game.time;
    return streaming || (profiling && onEndingTick);
  },

  shouldEmail() {
    return Profiler.type() === 'email' && Memory.profiler.disableTick === Game.time;
  },
};

var screepsProfiler = {
  wrap(callback) {
    if (enabled) {
      setupProfiler();
    }

    if (Profiler.isProfiling()) {
      usedOnStart = Game.cpu.getUsed();

      // Commented lines are part of an on going experiment to keep the profiler
      // performant, and measure certain types of overhead.

      // var callbackStart = Game.cpu.getUsed();
      const returnVal = callback();
      // var callbackEnd = Game.cpu.getUsed();
      Profiler.endTick();
      // var end = Game.cpu.getUsed();

      // var profilerTime = (end - start) - (callbackEnd - callbackStart);
      // var callbackTime = callbackEnd - callbackStart;
      // var unaccounted = end - profilerTime - callbackTime;
      // console.log('total-', end, 'profiler-', profilerTime, 'callbacktime-',
      // callbackTime, 'start-', start, 'unaccounted', unaccounted);
      return returnVal;
    }

    return callback();
  },

  enable() {
    enabled = true;
    hookUpPrototypes();
  },

  output: Profiler.output,

  registerObject: profileObjectFunctions,
  registerFN: profileFunction,
  registerClass: profileObjectFunctions,
};
var screepsProfiler_1 = screepsProfiler.wrap;
var screepsProfiler_2 = screepsProfiler.enable;

Structure.prototype.reservedEnergy = 0;
Structure.prototype.initTick = function () {
    this.reservedEnergy = 0;
};
Structure.prototype.needsRepair = function () {
    if (this.hits < this.hitsMax - 1700) {
        if (this.structureType == STRUCTURE_ROAD && this.hitsMax > ROAD_HITS * CONSTRUCTION_COST_ROAD_SWAMP_RATIO)
            return false; // only repair roads if they are on swamp or cheaper (NOT tunnels)
        return true;
    }
    else {
        return false;
    }
};

var log_enabled = ['',
    //  'spawn.recyclecreeps',
    //    'spawn.expandcreep'
    //  'creep.runscout',
    //    'creep.rundefender'
    //    'creep.runstransporter',
    //      'creep.runkeeperkiller',
    //    'spawn.spawncreepbyrole',
    //    'creep.runworker',
    //      'creep.runattacker',
    //'creep.runcolonist',
    //      'creep.dofindenergy'
    'creep.dowork',
];
var log_names = [
    'Worker10700218'
];
function log(caller, message, name = '') {
    if (log_names.length > 0 && name.length > 0) {
        let notFound = true;
        for (let log_name of log_names)
            if (log_name == name)
                notFound = false;
        if (notFound)
            return;
    }
    for (var i = 0; i < log_enabled.length; i++)
        if (caller == log_enabled[i])
            console.log(caller + ':' + name + ': ' + JSON.stringify(message));
}

const FLAG_DESTROY_PRIM = COLOR_RED;
const FLAG_DESTROY_SEC = COLOR_WHITE;
const FLAG_REPAIR_PRIM = COLOR_PURPLE;
const FLAG_REPAIR_SEC = COLOR_PURPLE;
const FLAG_REPAIRNOW_PRIM = COLOR_PURPLE;
const FLAG_REPAIRNOW_SEC = COLOR_WHITE;
const FLAG_ROAD_PRIM = COLOR_BROWN;
const FLAG_ROAD_SEC = COLOR_BROWN;
RoomPosition.prototype.createDestroyFlag = function () {
    if (this.findInRange(FIND_FLAGS, 0, { filter: (flag) => { return flag.color == FLAG_DESTROY_PRIM, flag.secondaryColor == FLAG_DESTROY_SEC; } }).length == 0) {
        this.createFlag(undefined, FLAG_DESTROY_PRIM, FLAG_DESTROY_SEC);
    }
};
RoomPosition.prototype.createRepairFlag = function () {
    if (this.findInRange(FIND_FLAGS, 0, { filter: (flag) => { return flag.color == FLAG_REPAIR_PRIM, flag.secondaryColor == FLAG_REPAIR_SEC; } }).length == 0) {
        this.createFlag(undefined, FLAG_REPAIR_PRIM, FLAG_REPAIR_SEC);
    }
};
RoomPosition.prototype.createRepairNowFlag = function () {
    if (this.findInRange(FIND_FLAGS, 0, { filter: (flag) => { return flag.color == FLAG_REPAIRNOW_PRIM, flag.secondaryColor == FLAG_REPAIRNOW_SEC; } }).length == 0) {
        this.createFlag(undefined, FLAG_REPAIRNOW_PRIM, FLAG_REPAIRNOW_SEC);
    }
};
RoomPosition.prototype.getStructure = function () {
    var structures = this.lookFor(LOOK_STRUCTURES);
    for (var structure of structures) {
        if (structure.structureType != STRUCTURE_ROAD)
            return structure;
    }
    return undefined;
};
RoomPosition.prototype.getNearestLink = function () {
    return this.findClosestByRange(FIND_MY_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_LINK; } });
};
RoomPosition.prototype.getInvader = function () {
    var invaders = Game.rooms[this.roomName].find(FIND_HOSTILE_CREEPS, { filter: o => { return o.owner.username != 'Source Keeper'; } });
    var target = this.findClosestByPath(invaders);
    var targetHealParts = 0;
    for (var invader of invaders) {
        var body = invader.body;
        var healParts = 0;
        for (let bodyPart of body)
            if (bodyPart.type == HEAL)
                healParts++;
        if (healParts > targetHealParts) {
            target = invader;
            targetHealParts = healParts;
        }
    }
    return target;
};
RoomPosition.prototype.createRoadFlag = function () {
    let flagName = 'R' + Game.time + '_' + this.roomName + this.x + this.y;
    return this.createFlag(flagName, FLAG_ROAD_PRIM, FLAG_ROAD_SEC);
};

// get container near roomobject
RoomObject.prototype.getContainer = function () {
    var result = this.pos.findInRange(FIND_STRUCTURES, 1, { filter: (structure) => { return structure.structureType == STRUCTURE_CONTAINER; } });
    if (result.length > 1)
        result[1].destroy();
    if (result == undefined)
        result = this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1, { filter: (csite) => { return csite.structureType == STRUCTURE_CONTAINER; } });
    if (result == undefined)
        result = [this];
    //if (result == undefined) result = this.pos.findInRange(FIND_DROPPED_RESOURCES,1)[0];
    return result[0];
};
//build path
RoomObject.prototype.buildPath = function (dest, buildcontainer = false, buildlink = false, buildterminal = false) {
    log('roomobject.buildpath', this.pos + ' to ' + dest);
    var result = PathFinder.search(this.pos, { pos: dest, range: 1 }, { maxOps: 100000,
        plainCost: 8,
        swampCost: 10,
        roomCallback: function (roomName) {
            let costMatrix = new PathFinder.CostMatrix;
            let room = Game.rooms[roomName];
            let scoutInfo = Game.atlas.getScoutInfo(roomName);
            if (scoutInfo == undefined || scoutInfo.hasEnemyCreeps)
                return false; // don't build path in enemy territory
            log('roomobject.buildpath', roomName);
            if (!room)
                return costMatrix;
            let structures = room.find(FIND_STRUCTURES);
            for (let structure of structures) {
                let value;
                switch (structure.structureType) {
                    case STRUCTURE_ROAD:
                        value = 6;
                        break;
                    case STRUCTURE_CONTAINER:
                        value = 1;
                        break;
                    case STRUCTURE_LINK:
                        value = 1;
                        break;
                    case STRUCTURE_WALL:
                        value = 8 + Math.ceil(structure.hits * 246 / structure.hitsMax);
                    default:
                        value = 255;
                        break;
                }
                costMatrix.set(structure.pos.x, structure.pos.y, value);
            }
            // road construction site tellen als gebouwde weg.
            for (let csite of room.find(FIND_CONSTRUCTION_SITES, { filter: (csite) => { return csite.structureType == STRUCTURE_ROAD; } })) {
                costMatrix.set(csite.pos.x, csite.pos.y, 6);
            }
            // om keepers heenbouwen
            for (var invader of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, { filter: (creep) => { return creep.owner.username == 'Source Keeper'; } })) {
                for (var x = -3; x <= 3; x++) {
                    for (var y = -3; y <= 3; y++) {
                        costMatrix.set(invader.pos.x + x, invader.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                    }
                }
            }
            for (var lair of room.find(FIND_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_KEEPER_LAIR; } })) {
                for (var x = -3; x <= 3; x++) {
                    for (var y = -3; y <= 3; y++) {
                        costMatrix.set(lair.pos.x + x, lair.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                    }
                }
            }
            return costMatrix;
        }
    });
    //    console.log ('buildpath: ' + result.incomplete  + ' ' + result.ops)
    log('roomobject.buildpath', result);
    for (var i = result.path.length - 1; i > 0; i--) { // 0 niet bouwen, dat is de structure zelf omgekeerd bouwen, eerst container en pad vanaf container.
        var pos = result.path[i];
        let targetRoom = Game.rooms[pos.roomName];
        if (targetRoom == undefined)
            continue;
        //  if (i>100) logger.log('roomobject.buildpath', i + ' ' + pos)
        if (targetRoom)
            targetRoom.visual.circle(pos);
        var structures = pos.lookFor(LOOK_STRUCTURES);
        var flags = pos.lookFor(LOOK_FLAGS);
        var hasRoad = false;
        var hasWall = false;
        for (var j = 0; j < structures.length; j++)
            if (structures[j].structureType == STRUCTURE_ROAD) {
                hasRoad = true;
                var roadHitsPct = structures[j].hits / structures[j].hitsMax;
            }
        for (var j = 0; j < structures.length; j++)
            if (structures[j].structureType == STRUCTURE_WALL)
                hasWall = true;
        //else if (roadHitsPct < 0.25) pos.createRepairNowFlag();
        //else if (roadHitsPct < 0.9) pos.createRepairFlag();
        if (hasWall)
            pos.createDestroyFlag();
        if (buildcontainer && i == result.path.length - 1) { // container bouwen bij bestemming
            var hasContainer = false;
            for (var j = 0; j < structures.length; j++)
                if (structures[j].structureType == STRUCTURE_CONTAINER)
                    hasContainer = true;
            if (hasContainer == false)
                log('roombobject.buildpath', pos.createConstructionSite(STRUCTURE_CONTAINER));
        }
        if (buildlink && i == result.path.length - 2) { // linkbouwen 2 bij controller vandaan
            let hasLink = false;
            for (let structure of structures)
                if (structure.structureType == STRUCTURE_LINK)
                    hasLink = true;
            if (hasLink == false)
                pos.createConstructionSite(STRUCTURE_LINK);
        }
        if (targetRoom && buildterminal && i == result.path.length - 3 && targetRoom.controller && targetRoom.controller.level >= 6) {
            let hasTerminal = false;
            if (targetRoom.controller.pos.findInRange(FIND_MY_STRUCTURES, 3, { filter: (o) => { return o.structureType == STRUCTURE_TERMINAL; } }).length >= 1)
                hasTerminal = true;
            if (hasTerminal == false) {
                if (targetRoom.terminal)
                    targetRoom.terminal.destroy();
                pos.createConstructionSite(STRUCTURE_TERMINAL);
            }
        }
        if (hasRoad == false && flags.length == 0 && pos.x > 0 && pos.x < 49 && pos.y > 0 && pos.y < 49)
            pos.createRoadFlag(Math.floor(Game.time / 1000)); //pos.createConstructionSite(STRUCTURE_ROAD);
    }
};

class Traveler {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
        log('traveler', 'running traveler', creep.name);
        // uncomment if you would like to register hostile rooms entered
        // this.updateRoomStatus(creep.room);
        if (options.avoidKeeper == undefined)
            options.avoidKeeper = true;
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
        if (creep.fatigue > 0) {
            Traveler.circle(creep.pos, "aqua", .3);
            return ERR_TIRED;
        }
        destination = this.normalizePos(destination);
        this.creepName = creep.name;
        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (options.range && rangeToDestination <= options.range) {
            return OK;
        }
        else if (rangeToDestination <= 1) {
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }
        //save destination for easy reference outside traveler
        creep.memory.destination = { roomName: destination.roomName, x: destination.x, y: destination.y };
        // repath if entering SK room and repath often in SK rooms and avoid keepers
        if (creep.room.isSKLair()) {
            log('traveler', 'in SK room!', creep.name);
            //options.repath = 0.2;
            if (options.avoidKeeper)
                options.roomCallback = matrix_AvoidKeeper;
            if (creep.memory.lastRoomName != creep.room.name)
                options.repath = 1;
        }
        creep.memory.lastRoomName = creep.room.name;
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination);
        // if stuck = 1000 within appproach distance. do nothing
        //if (state.stuckCount == 1000) return 0;
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (this.isStuck(creep, state)) {
            log('traveler', 'stuck!', creep.name);
            state.stuckCount++;
            Traveler.circle(creep.pos, "magenta", state.stuckCount * .2);
        }
        else {
            state.stuckCount = 0;
        }
        let newPath = false;
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        if (!state.incomplete && state.stuckCount >= options.stuckValue && Math.random() > .5) {
            log('traveler', 'fixing stuck', creep.name);
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            newPath = true;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path += state.destination.getDirectionTo(destination);
                state.destination = destination;
                state.incomplete = false;
            }
            else {
                newPath = true;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            log('traveler', 'doing random repath', creep.name);
            // add some chance that you will find a new path randomly
            newPath = true;
        }
        // wait 50 ticks for incomplete path saves cpu
        if (state.incomplete && state.stuckCount >= 50) {
            log('traveler', 'completely stuckwith incomplete. waiting', creep.name);
            newPath = true;
            state.stuckCount = 0;
        }
        // pathfinding
        if (newPath || (!travelData.path && !state.incomplete)) {
            log('traveler', 'finding new travel path', this.creepName);
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                console.log(`TRAVELER: incomplete path for ${creep.name}`);
                color = "red";
                state.incomplete = true;
                /*                if (options.approach) {
                                    if (rangeToDestination <= options.approach) {
                                        state.stuckCount = 1000;
                                    } else
                                        state.stuckCount = 100;
                                } */
            }
            else {
                state.incomplete = false;
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
        }
        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }
        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        return creep.move(nextDirection);
    }
    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        //return false;
        let scoutInfo = Game.atlas.getScoutInfo(roomName);
        let result = (scoutInfo == undefined || (scoutInfo.hasEnemyCreeps));
        log('traveler', `checkavoid: ${roomName} : ${result}`, this.creepName);
        //logger.log('traveler', scoutInfo, this.creepName)
        return result;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                room.memory.avoid = 1;
            }
            else {
                delete room.memory.avoid;
            }
        }
    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
        // check to see whether findRoute should be used
        let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
        let allowedRooms = options.route;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {
            log('traveler', 'using findroute', this.creepName);
            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler.checkAvoid(roomName)
                && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix);
                }
                else {
                    matrix = this.getCreepMatrix(room);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };
        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            }
            else {
            }
        }
        return ret;
    }
    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
     */
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                /*                if (!options.allowSK && !Game.rooms[roomName]) {
                                    if (!parsed) { parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName) as any; }
                                    let fMod = parsed[1] % 10;
                                    let sMod = parsed[2] % 10;
                                    let isSK =  !(fMod === 5 && sMod === 5) &&
                                        ((fMod >= 4) && (fMod <= 6)) &&
                                        ((sMod >= 4) && (sMod <= 6));
                                    if (isSK) {
                                        return 10 * highwayBias;
                                    }
                                }
                */
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        else {
            for (let value of ret) {
                allowedRooms[value.room] = true;
            }
        }
        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
        let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getStructureMatrix(room, freshMatrix) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            this.structureMatrixCache[room.name] = Traveler.addStructuresToMatrix(room, matrix, 1);
        }
        return this.structureMatrixCache[room.name];
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room) {
        //reset creep matrix at new tick
        if (Game.time !== this.creepMatrixTick) {
            this.creepMatrixCache = {};
            this.creepMatrixTick = Game.time;
        }
        if (this.creepMatrixCache[room.name] == undefined) {
            //            this.creepMatrixTick = Game.time;
            this.creepMatrixCache[room.name] = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true).clone());
        }
        return this.creepMatrixCache[room.name];
    }
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost) {
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        room.find(FIND_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        return matrix;
    }
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, { color: color, lineStyle: "dashed" });
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = 1;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.incomplete = travelData.state[STATE_INCOMPLETE];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X], travelData.state[STATE_DEST_Y], travelData.state[STATE_DEST_ROOMNAME]);
        }
        else {
            state.cpu = 0;
            state.destination = destination;
            state.incomplete = false;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
            destination.roomName, state.incomplete];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }
}
Traveler.structureMatrixCache = {};
Traveler.creepMatrixCache = {};
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 1000;
const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;
const STATE_INCOMPLETE = 7;
// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination, options) {
    //if (options == undefined) options = {};
    //if (!options.roomCallback && this.role != 'keeperkiller') options.roomCallback = matrix_AvoidKeeper;
    return Traveler.travelTo(this, destination, options);
};
// this can be further optimised by also caching if there is vision.
var keeperMatrix_cache = {};
function matrix_AvoidKeeper(roomName, costMatrix) {
    let room = Game.rooms[roomName];
    if (room) {
        for (var invader of room.find(FIND_HOSTILE_CREEPS, { filter: (creep) => { return creep.owner.username == 'Source Keeper'; } })) {
            for (var x = -3; x <= 3; x++) {
                for (var y = -3; y <= 3; y++) {
                    costMatrix.set(invader.pos.x + x, invader.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                }
            }
        }
        for (var lair of room.find(FIND_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_KEEPER_LAIR; } })) {
            for (var x = -1; x <= 1; x++) {
                for (var y = -1; y <= 1; y++) {
                    costMatrix.set(lair.pos.x + x, lair.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                }
            }
        }
        keeperMatrix_cache[roomName] = costMatrix;
    }
    else {
        if (keeperMatrix_cache[roomName])
            return keeperMatrix_cache[roomName];
    }
    return costMatrix;
}

// get container near roomobject
RoomObject.prototype.getContainer = function () {
    var result = this.pos.findInRange(FIND_STRUCTURES, 1, { filter: (structure) => { return structure.structureType == STRUCTURE_CONTAINER; } });
    if (result.length > 1)
        result[1].destroy();
    if (result == undefined)
        result = this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1, { filter: (csite) => { return csite.structureType == STRUCTURE_CONTAINER; } });
    if (result == undefined)
        result = [this];
    //if (result == undefined) result = this.pos.findInRange(FIND_DROPPED_RESOURCES,1)[0];
    return result[0];
};
//build path
RoomObject.prototype.buildPath = function (dest, buildcontainer = false, buildlink = false, buildterminal = false) {
    log('roomobject.buildpath', this.pos + ' to ' + dest);
    var result = PathFinder.search(this.pos, { pos: dest, range: 1 }, { maxOps: 100000,
        plainCost: 8,
        swampCost: 10,
        roomCallback: function (roomName) {
            let costMatrix = new PathFinder.CostMatrix;
            let room = Game.rooms[roomName];
            let scoutInfo = Game.atlas.getScoutInfo(roomName);
            if (scoutInfo == undefined || scoutInfo.hasEnemyCreeps)
                return false; // don't build path in enemy territory
            log('roomobject.buildpath', roomName);
            if (!room)
                return costMatrix;
            let structures = room.find(FIND_STRUCTURES);
            for (let structure of structures) {
                let value;
                switch (structure.structureType) {
                    case STRUCTURE_ROAD:
                        value = 6;
                        break;
                    case STRUCTURE_CONTAINER:
                        value = 1;
                        break;
                    case STRUCTURE_LINK:
                        value = 1;
                        break;
                    case STRUCTURE_WALL:
                        value = 8 + Math.ceil(structure.hits * 246 / structure.hitsMax);
                    default:
                        value = 255;
                        break;
                }
                costMatrix.set(structure.pos.x, structure.pos.y, value);
            }
            // road construction site tellen als gebouwde weg.
            for (let csite of room.find(FIND_CONSTRUCTION_SITES, { filter: (csite) => { return csite.structureType == STRUCTURE_ROAD; } })) {
                costMatrix.set(csite.pos.x, csite.pos.y, 6);
            }
            // om keepers heenbouwen
            for (var invader of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, { filter: (creep) => { return creep.owner.username == 'Source Keeper'; } })) {
                for (var x = -3; x <= 3; x++) {
                    for (var y = -3; y <= 3; y++) {
                        costMatrix.set(invader.pos.x + x, invader.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                    }
                }
            }
            for (var lair of room.find(FIND_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_KEEPER_LAIR; } })) {
                for (var x = -3; x <= 3; x++) {
                    for (var y = -3; y <= 3; y++) {
                        costMatrix.set(lair.pos.x + x, lair.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                    }
                }
            }
            return costMatrix;
        }
    });
    //    console.log ('buildpath: ' + result.incomplete  + ' ' + result.ops)
    log('roomobject.buildpath', result);
    for (var i = result.path.length - 1; i > 0; i--) { // 0 niet bouwen, dat is de structure zelf omgekeerd bouwen, eerst container en pad vanaf container.
        var pos = result.path[i];
        let targetRoom = Game.rooms[pos.roomName];
        if (targetRoom == undefined)
            continue;
        //  if (i>100) logger.log('roomobject.buildpath', i + ' ' + pos)
        if (targetRoom)
            targetRoom.visual.circle(pos);
        var structures = pos.lookFor(LOOK_STRUCTURES);
        var flags = pos.lookFor(LOOK_FLAGS);
        var hasRoad = false;
        var hasWall = false;
        for (var j = 0; j < structures.length; j++)
            if (structures[j].structureType == STRUCTURE_ROAD) {
                hasRoad = true;
                var roadHitsPct = structures[j].hits / structures[j].hitsMax;
            }
        for (var j = 0; j < structures.length; j++)
            if (structures[j].structureType == STRUCTURE_WALL)
                hasWall = true;
        //else if (roadHitsPct < 0.25) pos.createRepairNowFlag();
        //else if (roadHitsPct < 0.9) pos.createRepairFlag();
        if (hasWall)
            pos.createDestroyFlag();
        if (buildcontainer && i == result.path.length - 1) { // container bouwen bij bestemming
            var hasContainer = false;
            for (var j = 0; j < structures.length; j++)
                if (structures[j].structureType == STRUCTURE_CONTAINER)
                    hasContainer = true;
            if (hasContainer == false)
                log('roombobject.buildpath', pos.createConstructionSite(STRUCTURE_CONTAINER));
        }
        if (buildlink && i == result.path.length - 2) { // linkbouwen 2 bij controller vandaan
            let hasLink = false;
            for (let structure of structures)
                if (structure.structureType == STRUCTURE_LINK)
                    hasLink = true;
            if (hasLink == false)
                pos.createConstructionSite(STRUCTURE_LINK);
        }
        if (targetRoom && buildterminal && i == result.path.length - 3 && targetRoom.controller && targetRoom.controller.level >= 6) {
            let hasTerminal = false;
            if (targetRoom.controller.pos.findInRange(FIND_MY_STRUCTURES, 3, { filter: (o) => { return o.structureType == STRUCTURE_TERMINAL; } }).length >= 1)
                hasTerminal = true;
            if (hasTerminal == false) {
                if (targetRoom.terminal)
                    targetRoom.terminal.destroy();
                pos.createConstructionSite(STRUCTURE_TERMINAL);
            }
        }
        if (hasRoad == false && flags.length == 0 && pos.x > 0 && pos.x < 49 && pos.y > 0 && pos.y < 49)
            pos.createRoadFlag(Math.floor(Game.time / 1000)); //pos.createConstructionSite(STRUCTURE_ROAD);
    }
};

Structure.prototype.reservedEnergy = 0;
Structure.prototype.initTick = function () {
    this.reservedEnergy = 0;
};
Structure.prototype.needsRepair = function () {
    if (this.hits < this.hitsMax - 1700) {
        if (this.structureType == STRUCTURE_ROAD && this.hitsMax > ROAD_HITS * CONSTRUCTION_COST_ROAD_SWAMP_RATIO)
            return false; // only repair roads if they are on swamp or cheaper (NOT tunnels)
        return true;
    }
    else {
        return false;
    }
};

class Traveler$1 {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
        log('traveler', 'running traveler', creep.name);
        // uncomment if you would like to register hostile rooms entered
        // this.updateRoomStatus(creep.room);
        if (options.avoidKeeper == undefined)
            options.avoidKeeper = true;
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
        if (creep.fatigue > 0) {
            Traveler$1.circle(creep.pos, "aqua", .3);
            return ERR_TIRED;
        }
        destination = this.normalizePos(destination);
        this.creepName = creep.name;
        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (options.range && rangeToDestination <= options.range) {
            return OK;
        }
        else if (rangeToDestination <= 1) {
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }
        //save destination for easy reference outside traveler
        creep.memory.destination = { roomName: destination.roomName, x: destination.x, y: destination.y };
        // repath if entering SK room and repath often in SK rooms and avoid keepers
        if (creep.room.isSKLair()) {
            log('traveler', 'in SK room!', creep.name);
            //options.repath = 0.2;
            if (options.avoidKeeper)
                options.roomCallback = matrix_AvoidKeeper$1;
            if (creep.memory.lastRoomName != creep.room.name)
                options.repath = 1;
        }
        creep.memory.lastRoomName = creep.room.name;
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination);
        // if stuck = 1000 within appproach distance. do nothing
        //if (state.stuckCount == 1000) return 0;
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (this.isStuck(creep, state)) {
            log('traveler', 'stuck!', creep.name);
            state.stuckCount++;
            Traveler$1.circle(creep.pos, "magenta", state.stuckCount * .2);
        }
        else {
            state.stuckCount = 0;
        }
        let newPath = false;
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE$1;
        }
        if (!state.incomplete && state.stuckCount >= options.stuckValue && Math.random() > .5) {
            log('traveler', 'fixing stuck', creep.name);
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            newPath = true;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path += state.destination.getDirectionTo(destination);
                state.destination = destination;
                state.incomplete = false;
            }
            else {
                newPath = true;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            log('traveler', 'doing random repath', creep.name);
            // add some chance that you will find a new path randomly
            newPath = true;
        }
        // wait 50 ticks for incomplete path saves cpu
        if (state.incomplete && state.stuckCount >= 50) {
            log('traveler', 'completely stuckwith incomplete. waiting', creep.name);
            newPath = true;
            state.stuckCount = 0;
        }
        // pathfinding
        if (newPath || (!travelData.path && !state.incomplete)) {
            log('traveler', 'finding new travel path', this.creepName);
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD$1) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                console.log(`TRAVELER: incomplete path for ${creep.name}`);
                color = "red";
                state.incomplete = true;
                /*                if (options.approach) {
                                    if (rangeToDestination <= options.approach) {
                                        state.stuckCount = 1000;
                                    } else
                                        state.stuckCount = 100;
                                } */
            }
            else {
                state.incomplete = false;
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler$1.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
        }
        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }
        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = Traveler$1.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        return creep.move(nextDirection);
    }
    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        //return false;
        let scoutInfo = Game.atlas.getScoutInfo(roomName);
        let result = (scoutInfo == undefined || (scoutInfo.hasEnemyCreeps));
        log('traveler', `checkavoid: ${roomName} : ${result}`, this.creepName);
        //logger.log('traveler', scoutInfo, this.creepName)
        return result;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                room.memory.avoid = 1;
            }
            else {
                delete room.memory.avoid;
            }
        }
    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS$1,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
        // check to see whether findRoute should be used
        let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
        let allowedRooms = options.route;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {
            log('traveler', 'using findroute', this.creepName);
            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler$1.checkAvoid(roomName)
                && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler$1.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix);
                }
                else {
                    matrix = this.getCreepMatrix(room);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };
        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            }
            else {
            }
        }
        return ret;
    }
    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
     */
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler$1.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                /*                if (!options.allowSK && !Game.rooms[roomName]) {
                                    if (!parsed) { parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName) as any; }
                                    let fMod = parsed[1] % 10;
                                    let sMod = parsed[2] % 10;
                                    let isSK =  !(fMod === 5 && sMod === 5) &&
                                        ((fMod >= 4) && (fMod <= 6)) &&
                                        ((sMod >= 4) && (sMod <= 6));
                                    if (isSK) {
                                        return 10 * highwayBias;
                                    }
                                }
                */
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        else {
            for (let value of ret) {
                allowedRooms[value.room] = true;
            }
        }
        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
        let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getStructureMatrix(room, freshMatrix) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            this.structureMatrixCache[room.name] = Traveler$1.addStructuresToMatrix(room, matrix, 1);
        }
        return this.structureMatrixCache[room.name];
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room) {
        //reset creep matrix at new tick
        if (Game.time !== this.creepMatrixTick) {
            this.creepMatrixCache = {};
            this.creepMatrixTick = Game.time;
        }
        if (this.creepMatrixCache[room.name] == undefined) {
            //            this.creepMatrixTick = Game.time;
            this.creepMatrixCache[room.name] = Traveler$1.addCreepsToMatrix(room, this.getStructureMatrix(room, true).clone());
        }
        return this.creepMatrixCache[room.name];
    }
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost) {
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        room.find(FIND_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        return matrix;
    }
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, { color: color, lineStyle: "dashed" });
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = 1;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X$1], y: travelData.state[STATE_PREV_Y$1] };
            state.cpu = travelData.state[STATE_CPU$1];
            state.stuckCount = travelData.state[STATE_STUCK$1];
            state.incomplete = travelData.state[STATE_INCOMPLETE$1];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X$1], travelData.state[STATE_DEST_Y$1], travelData.state[STATE_DEST_ROOMNAME$1]);
        }
        else {
            state.cpu = 0;
            state.destination = destination;
            state.incomplete = false;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
            destination.roomName, state.incomplete];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }
}
Traveler$1.structureMatrixCache = {};
Traveler$1.creepMatrixCache = {};
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD$1 = 1000;
const DEFAULT_MAXOPS$1 = 20000;
const DEFAULT_STUCK_VALUE$1 = 2;
const STATE_PREV_X$1 = 0;
const STATE_PREV_Y$1 = 1;
const STATE_STUCK$1 = 2;
const STATE_CPU$1 = 3;
const STATE_DEST_X$1 = 4;
const STATE_DEST_Y$1 = 5;
const STATE_DEST_ROOMNAME$1 = 6;
const STATE_INCOMPLETE$1 = 7;
// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination, options) {
    //if (options == undefined) options = {};
    //if (!options.roomCallback && this.role != 'keeperkiller') options.roomCallback = matrix_AvoidKeeper;
    return Traveler$1.travelTo(this, destination, options);
};
// this can be further optimised by also caching if there is vision.
var keeperMatrix_cache$1 = {};
function matrix_AvoidKeeper$1(roomName, costMatrix) {
    let room = Game.rooms[roomName];
    if (room) {
        for (var invader of room.find(FIND_HOSTILE_CREEPS, { filter: (creep) => { return creep.owner.username == 'Source Keeper'; } })) {
            for (var x = -3; x <= 3; x++) {
                for (var y = -3; y <= 3; y++) {
                    costMatrix.set(invader.pos.x + x, invader.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                }
            }
        }
        for (var lair of room.find(FIND_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_KEEPER_LAIR; } })) {
            for (var x = -1; x <= 1; x++) {
                for (var y = -1; y <= 1; y++) {
                    costMatrix.set(lair.pos.x + x, lair.pos.y + y, 255); // set square 3x3 around invader nonwalkable
                }
            }
        }
        keeperMatrix_cache$1[roomName] = costMatrix;
    }
    else {
        if (keeperMatrix_cache$1[roomName])
            return keeperMatrix_cache$1[roomName];
    }
    return costMatrix;
}

var log_enabled$1 = ['',
    //  'spawn.recyclecreeps',
    //    'spawn.expandcreep'
    //  'creep.runscout',
    //    'creep.rundefender'
    //    'creep.runstransporter',
    //      'creep.runkeeperkiller',
    //    'spawn.spawncreepbyrole',
    //    'creep.runworker',
    //      'creep.runattacker',
    //'creep.runcolonist',
    //      'creep.dofindenergy'
    'creep.dowork',
];
var log_names$1 = [
    'Worker10700218'
];
function log$1(caller, message, name = '') {
    if (log_names$1.length > 0 && name.length > 0) {
        let notFound = true;
        for (let log_name of log_names$1)
            if (log_name == name)
                notFound = false;
        if (notFound)
            return;
    }
    for (var i = 0; i < log_enabled$1.length; i++)
        if (caller == log_enabled$1[i])
            console.log(caller + ':' + name + ': ' + JSON.stringify(message));
}

var logger = /*#__PURE__*/Object.freeze({
  log: log$1
});

var logger$1 = ( logger && undefined ) || logger;

var myflags$1 = {
    FLAG_DESTROY_PRIM: COLOR_RED,
    FLAG_DESTROY_SEC: COLOR_WHITE,

    FLAG_ATTACK_PRIM: COLOR_RED,
    FLAG_ATTACK_SEC: COLOR_PURPLE,
    FLAG_ATTACKWP_PRIM: COLOR_PURPLE,
    FLAG_ATTACKWP_SEC: COLOR_BLUE,

     getFlags (colorPrim, colorSec, startsWith ) {
        var flags=[];
        for(var flagname in Game.flags) {
            var flag = Game.flags[flagname];
            if (flag.color == colorPrim && flag.secondaryColor == colorSec  ) {
                if (startsWith) {
                    let flagStart = flagname.substring(0, startsWith.length);
                    if (flagStart == startsWith) flags.push(flag);
                } else flags.push(flag);
            }
        }
        return flags;
    },

    getDestroyFlags() {
        return this.getFlags(this.FLAG_DESTROY_PRIM, this.FLAG_DESTROY_SEC);
    },

    getAttackFlags() {
        let flags = this.getFlags(this.FLAG_ATTACK_PRIM, this.FLAG_ATTACK_SEC);
        flags.sort((flaga, flagb) => {return flaga.name > flagb.name});
        return flags;
    },

    getAttackWPFlags(wpCode) {
        let flags = this.getFlags(this.FLAG_ATTACKWP_PRIM, this.FLAG_ATTACKWP_SEC, wpCode);
        flags.sort((flaga, flagb) => {return flaga.name > flagb.name});
        return flags;
    }
};

//require ('room');






const emergencyUpgradeMin = 3100;
const emergencyUpgradeMax = 5000;
const WORKER_IDLE_UPGRADE = 30000;
const TERMINAL_FILL = 75000;
const MY_SIGN = 'JDAZ: Autonomous AI 🐺';
const CONSTRUCTION_MIN_STORED_ENERGY = 4000; // minimum amount of stored energy for new construction to start. If less then this, workers will not construct. This prevents workers from eating
                            // up all the energy that is needed for creep construction

function matrix_AvoidKeeper$2 (roomName, costMatrix) {
    logger$1.log('matrix_avoidkeeper', roomName);
    if (Game.rooms[roomName]) {
        for(var invader of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username == 'Source Keeper'}})) {
            for (var x=-3; x <=3; x++) {
                for (var y=-3; y <=3; y++) {
                    costMatrix.set(invader.pos.x + x,invader.pos.y + y,255); // set square 3x3 around invader nonwalkable
                }
            }
        }
    }
    return costMatrix;
}

Creep.prototype._say = Creep.prototype.say;

Creep.prototype.say = function(message) {
    //this._say(message);
    return;
};


Creep.prototype.visualize = function(){
    this.room.visual.text (this.memory.role.charAt(0).toUpperCase(), this.pos, {stroke: '#000000', font: '0.4', strokeWidth: 0.1});
};

Creep.prototype.run = function() {
    this.visualize();
    if (this.memory.recycle) {
        this.recycle();
        return;
    }
    if (this.memory.sleep) {
        this.say('ZzZz');
        return;
    }

    //ga naar ingeprogrammeerde bestemming;
    if (this.memory.destination && this.memory.role != 'worker' && this.memory.role != 'scout' && this.room.name != this.memory.destination.roomName) {
        this.say ('dest');
        let destination = new RoomPosition(this.memory.destination.x, this.memory.destination.y, this.memory.destination.roomName);
        this.travelTo (destination);
        if (this.pos.isNearTo(destination)) delete this.memory.destination;
        return;
    }

    switch (this.memory.role) {
    case 'worker':
        this.runWorker();
        return;
    case 'harvester':
        this.runHarvester();
        return;
    case 'transporter':
        this.runTransporter();
        return;
    case 'reserver':
        this.runReserver();
        return;
    case 'upgrader':
        this.runUpgrader();
        return;
    case 'filler':
        this.runFiller();
        return;
    case 'scout':
        this.runScout();
        return;
    case 'defender':
        this.runDefender();
        return;
    case 'attacker':
        this.runAttacker();
        return;
    case 'colonist':
        this.runColonist();
        return;
    case 'reserver':
        this.runReserver();
        return;
    case 'initializer':
        this.runInitializer();
        return;
    case 'keeperkiller':
        this.runKeeperKiller();
        return;
    }
};

Creep.prototype.runKeeperKiller = function() {
    this.doHeal();
    if (this.memory.targetRoomName != this.room.name) {
        if (this.memory.birthTime == undefined) this.memory.birthTime = Game.time;
        this.travelTo(Game.atlas.getRoomCenter(this.memory.targetRoomName));
        this.memory.travelTime = Game.time - this.memory.birthTime;
        return;
    } else {
        let hostile = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if (hostile) {
            logger$1.log('runkeeperkiller', 'attacking ' + hostile.name);
            let range = this.pos.getRangeTo(hostile.pos);
            if (range == 5 && this.hits < this.hitsMax) return //
            if (this.rangedAttack(hostile) == ERR_NOT_IN_RANGE) this.travelTo(hostile.pos, {avoidKeeper: false});
            if (range < 3) this.fleeFrom(hostile);
            //if (this.attack(hostile) == ERR_NOT_IN_RANGE) this.travelTo(hostile.pos, {avoidKeeper: false});
        } else {
            let lairs = this.room.find(FIND_STRUCTURES, {filter: o => {return o.structureType == STRUCTURE_KEEPER_LAIR}});
            lairs.sort( (a,b) => {
                if (a.ticksToSpawn < b.ticksToSpawn) return -1
                if (a.ticksToSpawn > b.ticksToSpawn) return 1
                return 0;
            });
            let dest = lairs[0].pos;
            if (!this.pos.inRangeTo(dest,3)) this.travelTo(dest);
        }
    }
    if (this.memory.travelTime + 150 + 50 <= this.ticksToLive) this.replace = true;
    return;
};

Creep.prototype.runScout = function() {
    logger$1.log('creep.runscout', 'Running scout ', this.name);
    if (!this.firstRun) {
        this.notifyWhenAttacked(false);
        this.firstRun = false;
    }
    //this.room.memory.lastSeenByScout = Game.time;
    let exits = Game.map.describeExits(this.room.name);
    let destRoomName = this.memory.destRoomName;
    if (destRoomName == this.room.name) destRoomName = undefined;
    if (destRoomName == undefined) {
        logger$1.log ('creep.runscout', 'Checking new rooms', this.name);
        let destRoomLastVisit = Game.time;
        for (let exitKey in exits) {
            let roomName = exits[exitKey];
            logger$1.log ('creep.runscout', 'Checking ' + roomName, this.name);
            //logger.log ('creep.runscout', Memory.rooms[roomName], this.name)
            let scoutInfo = Game.atlas.getScoutInfo(roomName);
            if (Game.map.isRoomAvailable(roomName) && scoutInfo) {
                let lastSeenByScout = scoutInfo.lastSeen;
                logger$1.log ('creep.runscout', 'room lastseen' + roomName + ' ' + lastSeenByScout, this.name);
                if (lastSeenByScout == undefined) lastSeenByScout = 0;
                if (lastSeenByScout < destRoomLastVisit) {
                    destRoomName = roomName;
                    destRoomLastVisit = lastSeenByScout;
                }
            } else if (Game.map.isRoomAvailable(roomName)  && Game.map.getRoomLinearDistance(roomName, this.memory.HomeRoomName)<=10) {//) { // never visited, max 10 rooms away
                logger$1.log ('creep.runscout', 'No room memory new destination! ' + roomName, this.name);
                destRoomName = roomName;
                break;
            }
        }
        if (destRoomName == undefined) {
            logger$1.log ('creep.runscout', 'no room found, picking random', this.name);
            let keys = Object.keys (exits);
            let exitKey = keys[Math.floor(keys.length * Math.random())];
            destRoomName = exits[exitKey];
        }
    }
    this.memory.destRoomName = destRoomName;
    logger$1.log ('creep.runscout', 'Moving to room ' + destRoomName, this.name);
    //let nearInvader = (this.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length > 0)?1:0;
    //let exitArray = this.room.find(this.room.findExitTo(destRoomName));
    //let dest = exitArray[Math.floor(exitArray.length/2)]
    let dest = Game.atlas.getRoomCenter(destRoomName);
    logger$1.log('creep.runscout', 'dest: ' + dest, this.name);
    this.travelTo (dest);
};

Creep.prototype.runAttacker = function() {
    /*
    if (!this.memory.startAttack) {
        if (this.pos.findInRange(FIND_MY_CREEPS,4,{filter: (creep) =>{return creep.memory.role == 'attacker' && creep.name != this.name}}).length > 0) {
            this.memory.startAttack = true;
            this.say('Go');
        } else {
            this.say('Wait');
            return;
        }
    }*/

    this.doHeal();


    let attackFlags = myflags$1.getAttackFlags();
    let targetRoomName = this.memory.targetRoomName;



    let hostileCreeps = this.pos.findInRange(FIND_HOSTILE_CREEPS,3);
    if (hostileCreeps.length > 0) {
        logger$1.log('creep.runattacker', 'hostile creeps, enganging');
        let hostileCreep = this.pos.findClosestByPath(hostileCreeps);
        if (this.pos.isNearTo(hostileCreep)) {
            this.attack (hostileCreep);
            return;
        } else if (hostileCreep) {
            this.travelTo (hostileCreep);
            return;
        }
    }

    // fodder niet te dicht bij laten komne
    if( this.body.length == 1 && attackFlags.length > 0) {
        if (this.room.name == targetRoomName){

            // zelfmoord plegen als hij in de weg staat voor dikke creep
             if(this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) =>{return creep.memory.role == 'attacker' && creep.body.length > 1}}).length>0) {
                 this.suicide();
             } else { // anders vijandelijke creeps verstikken
                this.doAttack();
             }
             return;
        }
    }

    // towers aanvullen
    let tower = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter: (structure) => {return structure.structureType == STRUCTURE_TOWER}});
    if (tower) {
        if (this.pos.isNearTo(tower)) {
            this.attack(tower);
            return;
        } else {
            this.travelTo(tower);
            return;
        }
    }


    // target aanvallen
    if (this.pos.isNearTo(attackFlags[0])) {
        let structure = attackFlags[0].pos.getStructure();
        if (structure) {
            this.attack(structure);
            return;
        } else {
            attackFlags[0].remove();
            return;
        }
    }

    if (!this.memory.attackWP) this.memory.attackWP = 0;
    let wpFlags = myflags$1.getAttackWPFlags(this.memory.HomeRoomName);
    if (this.memory.attackWP < wpFlags.length) {
        if (this.pos.isNearTo(wpFlags[this.memory.attackWP])) this.memory.attackWP++;
    }
    if (this.memory.attackWP < wpFlags.length) {
        logger$1.log('creep.runattacker', 'moving to attackWPflag ' +wpFlags[this.memory.attackWP].pos);
        this.travelTo(wpFlags[this.memory.attackWP], {range: 1,costCallback: matrix_AvoidKeeper$2});
        return;
    }

    if (attackFlags[0]) {
        logger$1.log('creep.runattacker', this.name + ' moving to attackflag ' + attackFlags[0].pos);
        this.travelTo(attackFlags[0],{range: 1, costCallback: matrix_AvoidKeeper$2});
    }    else {
        logger$1.log ('doing generic attack');
        this.doAttack();
    }

    //indien geen attackflag, dan naar target room gaan
    if (attackFlags == undefined) {
        if (this.doAttack()) {
            return;
        } else {
            this.travelTo (Game.atlas.getRoomCenter(targetRoomName));
        }
    }

    return;
};

Creep.prototype.runColonist = function() {
    //console.log ('creep.colonist', 'RUNNING COLONIST ' +this.name + ' at ' +this.pos)
//    var redFlags = []; // attack flags
//    var yellowFlags = []; // colonize flag
//    var curFlag = this.memory.curFlag;
    var hasClaimPart = false;
    var hasAttackPart = false;
    for (var i=0; i < this.body.length;i++) {
        if (this.body[i].type == CLAIM) hasClaimPart = true;
        if (this.body[i].type == ATTACK) hasAttackPart = true;
    }
/*    if (curFlag == undefined) curFlag = 0;
    for (var flagname in Game.flags) {
        var flag = Game.flags[flagname]
        if (flag.color==COLOR_YELLOW && flag.name.startsWith( this.memory.HomeRoomName)) yellowFlags.push(flag);
        if (flag.color==COLOR_RED) redFlags.push(flag);
    }
*/
    if (Memory.colRoom == undefined ) return;
    logger$1.log('creep.runcolonist', 'running colonist ' + this.name);



    var targetRoomName = Memory.colRoom;
    let targetRoom = Game.rooms[targetRoomName];

    //indien room niet zichtbaar, er naar toe moven
    if (targetRoom != this.room) {
        this.say('C');
        this.travelTo(new RoomPosition(Memory.colX, Memory.colY, Memory.colRoom));
        return;
    }

    //console.log ( hasClaimPart)
    // indien room van ander, attacken
    //console.log (targetRoom.controller.me)
    if (hasClaimPart && !targetRoom.controller.my && targetRoom.controller.owner) {
        //console.log ('attacking controller')
        if (this.attackController(targetRoom.controller) == ERR_NOT_IN_RANGE) this.travelTo(targetRoom.controller);
        return;
    }

    // indien room niet van mij, claimen
    if (hasClaimPart && !targetRoom.controller.my) {
        //console.log ('claiming controller')
        if (this.claimController(targetRoom.controller)== ERR_NOT_IN_RANGE) {
            this.travelTo(targetRoom.controller);
            this.say ('controller');
        }
        return;
    }

    if (targetRoom.controller.my && this.room.name == targetRoomName) {
        // controller is van mij. yellow flag verwijderen, spawn building site plaatsen en een worker worden.
        this.travelTo(targetRoom.controller);
        targetRoom.createConstructionSite(Memory.colX, Memory.colY,STRUCTURE_SPAWN);
        this.memory.role = 'worker';
        this.memory.HomeRoomName = targetRoomName;
        return;
    } else {
        // move naar controller
        //console.log ('moving to controller')
        this.travelTo(targetRoom.controller);
        this.say('zz');
        return;
    }
};

Creep.prototype.runFiller = function () {
    this.idle = false;
    if (this.carry.energy == 0)
        this.memory.state = 'findEnergy';
    if (this.carry.energy == this.carryCapacity)
        this.memory.state = 'doWork';

    switch(this.memory.state) {
        case 'findEnergy':
            this.doFindEnergy(this);
            return;
        case 'doWork':
            if (this.doFill()) return;
            this.memory.state = 'findEnergy';
            return;
    }
};

Creep.prototype.doFill = function () {
    //returns true als hij kan fillen, anders false als er niets te vullen valt.


    var creep = this;
    var target;

    //energie naar toren indien er een invader is
    if (this.room.getInvader() !== undefined) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return ((    structure.structureType == STRUCTURE_TOWER
                            ) && structure.energy  < structure.energyCapacity)
                }
            });
    }

    //energie brengen naar spawn en link
    if (target == undefined) {
        let targets = this.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return ((    structure.structureType == STRUCTURE_EXTENSION
                    || structure.structureType == STRUCTURE_SPAWN
                        ) && structure.energy  < structure.energyCapacity)
            }
        });
        if (this.room.storage && this.memory.role == 'filler') {
            let link = this.room.storage.pos.getNearestLink();
            if (link && link.energy < link.energyCapacity) targets.push(link);
        }
        target = this.pos.findClosestByPath(targets);
    }
    //energie brengen naar toren
    if (target == undefined) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((    structure.structureType == STRUCTURE_TOWER
                                    ) && structure.energy < structure.energyCapacity)
                        }
                    });
    }


    //energie brengen naar terminal
    if (target == undefined && this.room.controller && this.room.controller.level >= 8) {
        target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return ((    structure.structureType == STRUCTURE_TERMINAL
                                    ) && _.sum(structure.store) < TERMINAL_FILL)
                        }
                    });
    }

    // indien er een grote stapel losse energie is, de storage gaan vullen
    if (target == undefined) {
        let largeDroppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {filter: (dropped) => {return dropped.amount > 2000
            && dropped.resourceType == RESOURCE_ENERGY
            }});
        if (largeDroppedEnergy.length>0) {
            target = creep.room.storage;
        }
    }

    if (target) {
    //console.log ('target: ' + target + ' energy: ' +target.energy + ' reserved: ' + target.reservedEnergy + ' capacity: ' + target.energyCapacity);
        if (creep.transfer(target, RESOURCE_ENERGY)==ERR_NOT_IN_RANGE) {
            creep.travelTo(target,{visualizePathStyle: {stroke: '#ffffff'}});
        }
            //            creep.say('W');
        return true;
    }
    return false;

};

Creep.prototype.doAttack = function(){
    var hostilecreep = this.pos.getInvader();
    if (hostilecreep == undefined) hostilecreep = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter: (structure) => {structure.structureType != STRUCTURE_CONTROLLER;}});
    if (hostilecreep) {
        //console.log ('creep '+ this.name + ' attacking ' + hostilecreep)
        this.rangedAttack(hostilecreep);
        this.attack(hostilecreep);
        if (!this.pos.isNearTo(hostilecreep)) this.travelTo(hostilecreep);
        this.say('A');
        return true;
    } else
    {
        return false;
    }
};

Creep.prototype.doHeal = function() {
    let hasHeal=false;
    for (let bodypart of this.body) if (bodypart.type == HEAL) hasHeal = true;
    if (hasHeal){
        let woundedCreeps = this.pos.findInRange(FIND_MY_CREEPS, 3, {filter: (creep) => {return creep.hits < creep.hitsMax}});
        if (woundedCreeps.length > 0) this.heal( this.pos.findClosestByRange(woundedCreeps));
    }
};

Creep.prototype.autoBuild = function() {
//    console.log('CREEP AUTOBUILD')
    //if (this.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return //niet autobouwen als er nog iets te bouwen is;
    var role = this.memory.role;
    if (role == 'transporter' || role == 'courier') {
        if (this.pos.lookFor(LOOK_STRUCTURES).length == 0) {
//            this.room.createConstructionSite(this.pos,STRUCTURE_ROAD);
        }
    }

    if (role == 'harvester' && this.pos.findInRange(FIND_SOURCES,1).length>0 ) {
        if (this.pos.findInRange(FIND_STRUCTURES, 2, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER}}).length == 0)
            if (this.pos.findInRange(FIND_CONSTRUCTION_SITES,2, {filter: (csite) => {return csite.structureType == STRUCTURE_CONTAINER}}).length == 0) {
//                this.room.createConstructionSite(this.pos,STRUCTURE_CONTAINER);
            }
    }

};

Creep.prototype.runUpgrader = function() {
     this.idle = false;
    if (this.carry.energy == 0)
        this.memory.state = 'findEnergy';
    if (this.carry.energy == this.carryCapacity)
        this.memory.state = 'doWork';

    switch(this.memory.state) {
        case 'findEnergy':
            this.doFindEnergy(this);
            return;
        case 'doWork':
            this.doUpgrade(this);
            return;
    }

};



Creep.prototype.doUpgrade = function() {
    switch (this.upgradeController(this.room.controller)) {
        case ERR_NOT_IN_RANGE:
            this.travelTo(this.room.controller);
            return;
    }
};

Creep.prototype.runReserver = function() {
//    console.log ('running scout' + this.name + 'in room ' +this.room)
    var roomName = this.memory.targetRoomName;
    var room = Game.rooms[roomName];
    if (this.room.controller && (!this.room.controller.sign || this.room.controller.sign.text != MY_SIGN ) && this.body.length > 1) {
        logger$1.log('creep.runreserver', this.room.controller.sign);
        if (this.signController(this.room.controller, MY_SIGN) == ERR_NOT_IN_RANGE ) {
            this.travelTo(this.room.controller.pos);
            return;
        }
    }


    if (room && room.controller) {
        if (this.body.length == 1 && room.controller && !this.pos.isNearTo(room.controller.pos)) {
            this.travelTo(room.controller.pos);
        }
        if (room.controller && room.controller.owner && !room.controller.my) {
            if (this.attackController(room.controller) == ERR_NOT_IN_RANGE) {
                this.travelTo(room.controller.pos);
            }
        } else if (this.reserveController(room.controller) == ERR_NOT_IN_RANGE) {
            this.travelTo(room.controller.pos);
            //console.log('going to controller')
        } else if(room.controller == undefined) {
            if (this.travelTo(Game.atlas.getRoomCenter(roomName))!= OK) this.memory.sleep = true;
        }
    }
    else {
        if (roomName) {
            this.travelTo(Game.atlas.getRoomCenter(roomName), );
        }
    }
};

Creep.prototype.runDefender = function() {
    logger$1.log ('creep.rundefender', this.name);
    this.doHeal();
    var room = this.room;
    // defend this room
    if(this.room.find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username != 'Source Keeper'}}).length>0) {
//        console.log ('defending this room')
        this.doAttack();
        return;
    } else {
        //defend other harvest rooms
        var harvestRooms = Game.rooms[this.memory.HomeRoomName].findHarvestRooms();
        for(var i=0; i<harvestRooms.length;i++) {
            var room = Game.rooms[harvestRooms[i]];
            var hostileCreeps = [];
            if (room) hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username != 'Source Keeper'}});
            if (hostileCreeps.length>0){
                this.memory.attackRoom = room.name;
                this.travelTo(hostileCreeps[0]);
                return;
            }
        }
        if (this.memory.attackRoom) {
            this.travelTo(Game.atlas.getRoomCenter(this.memory.attackRoom));
            if (this.room.name == this.memory.attackRoom) delete this.memory.attackRoom;
            return;
        } else {
            //niks meer te doen, recyclen. prevent recycling
            this.recycle();
            /*
            //destroyflags kapot maken
            logger.log('creep.rundefender', myFlags.getDestroyFlags())

            for(var flag of myFlags.getDestroyFlags()) {
                logger.log('creep.rundefender', 'checking destroy flag '+flag.name + flag.pos.roomName + this.room.name)
                logger.log('creep.rundefender', Game.map.findRoute(this.room.name, flag.pos.roomName))
                if (Game.map.findRoute(this.room.name, flag.pos.roomName).length <= CREEP_DEFENSE_DISTANCE) {
                    if(!this.pos.isNearTo(flag.pos)) {
                        this.travelTo(flag);
                    }
                    if (flag.room) {
                        var structure = flag.pos.getStructure();
                        if (structure) {
                            this.attack(structure);
                            this.rangedAttack(structure);
                            return;
                        } else {
                            flag.remove();
                        }
                    }
                }
            } */

        }
    }
};



Creep.prototype.recycle = function() {
    this.memory.recycle = true;
    var spawn = Game.rooms[this.memory.HomeRoomName].getSpawn();
    var target = spawn.getContainer();
    if (!target) target = spawn;
    if (spawn.recycleCreep(this) == ERR_NOT_IN_RANGE) this.travelTo(target);
};

Creep.prototype.runTransporter = function() {
    if (this.memory.timeStartTransport == undefined) this.memory.timeStartTransport = Game.time;

    // vluchten van keepers
    if (this.room.isSKLair()) {
        if (this.fleeFromKeeper()) return true;
    }


    var source =  Game.getObjectById(this.memory.targetSourceId);
    var container = source?source.getContainer():undefined;
    if (!(container instanceof StructureContainer)) container = undefined;

    if (_.sum(this.carry) == 0 || _.sum(this.carry) < this.carryCapacity && container && container.pos.isNearTo(this.pos) ) { // leeg, energy ophalen
        //logger.log('creep.runstransporter', 'going to source ' + source)
        if (source && container) {
            //wachten indien je naast een transporter staat die aan het loaden is
 //           if (this.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (creep) => {   let carry = _.sum(creep.carry);
//                                                                            return creep.name != this.name && creep.memory.role == 'transporter' && carry > 0 && carry < creep.carryCapacity && creep.memory.targetSourceId == this.memory.targetSourceId
//                                                                        }}).length > 0 ) return;
            let energy = container.pos.lookFor(LOOK_ENERGY)[0];
            if (!this.pos.isNearTo(container.pos)) this.travelTo(container.pos);
            else {
                let energyPickedUp = 0;
                if (energy && energy.amount) {
                    this.pickup(energy);
                    energyPickedUp = energy.amount;
                }
                let withDrawAmount = Math.max (Math.min(this.carryCapacity - _.sum(this.carry) - energyPickedUp, container.store.energy), 0);
                if (withDrawAmount > 0 ) this.withdraw(container, RESOURCE_ENERGY, withDrawAmount);
                if (_.sum(this.carry) == 0){
                    logger$1.log('creep.runstransporter', this.name + ' picking up energy in ' +this.room.name);
                    logger$1.log('creep.runstransporter', 'withdrawamount: ' + withDrawAmount);
                    let newLoad = container.store?(container.store.energy||0):0;
                    if (energy) newLoad += energy.amount;
                    logger$1.log('creep.runstransporter', 'energy?energy.amount:0: ' + (energy==undefined?0:energy.amount) );

                    logger$1.log('creep.runstransporter', 'newload: ' + newLoad);
                    if (!Memory.transportLoad[this.memory.targetSourceId]) Memory.transportLoad[this.memory.targetSourceId] =  newLoad;
                    Memory.transportLoad[this.memory.targetSourceId] = Memory.transportLoad[this.memory.targetSourceId] /100 * 99 + newLoad/100;
                    logger$1.log('creep.runstransporter', 'newtransportload: ' + Memory.transportLoad[this.memory.targetSourceId]);
                }
            }
        } else {
            if (this.memory.sourceRoomName) this.travelTo (Game.atlas.getRoomCenter(this.memory.sourceRoomName));
        }
    }
    else { // vol energie droppen
/*        //energie pakken die naast hem ligt
        if (_.sum(this.carry) < this.carryCapacity) {
            let energy = this.pos.findInRange(FIND_DROPPED_RESOURCES,{filter: (resource) => {return resource.resourceType == RESOURCE_ENERGY}}, 1)[0];
            if (energy) {
                this.withdraw(energy);
                return;
            }
        }
*/
        //energie brengen naar worker in sourcekeeper lair
        if (Game.rooms[this.memory.HomeRoomName].controller.level < 7 && this.room.isSKLair() && this.room.find(FIND_CONSTRUCTION_SITES).length>0 ) {
            let workerCreep = this.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (creep) => {return creep.memory.role == 'worker'}});
            if (workerCreep) {
                if (this.pos.isNearTo(workerCreep)) {
                    this.drop(RESOURCE_ENERGY);
                } else {
                    this.travelTo(workerCreep);
                }
                return;
            }
        }

        if (Memory.transportLoad == undefined) Memory.transportLoad = new Object;
        var homeroom = Game.rooms[this.memory.HomeRoomName];

        let container;
        if (this.memory.dropPointID) {
            container = Game.getObjectById (this.memory.dropPointID);
        } else {
            if (this.room.name != this.memory.HomeRoomName ){
                this.travelTo(Game.rooms[this.memory.HomeRoomName].getSpawn());
            } else {
                container = this.pos.findClosestByPath(homeroom.findEnergyDropPoints(this.carry.energy));
                //if (container == undefined) container = homeroom.storage;
                if (container) this.memory.dropPointID = container.id;
            }
        }

        // uitrekenen of hij vervangen moet worden
        var lastTransportTime = this.memory.timeLastTransport;
        var transportTime = Game.time - this.memory.timeStartTransport;
        if (this.memory.replace == undefined && this.carry.energy / this.carryCapacity > 0.7 && lastTransportTime * 1.05 + (lastTransportTime - transportTime) + this.getSpawnTime() > this.ticksToLive
            && this.carryCapacity * 1.5 > Game.rooms[this.memory.HomeRoomName].getEnergyCapacityAvailable())
        {
            this.memory.replace = true;
            for (let creepName in Game.creeps) {
                let creep = Game.creeps[creepName];
                if (creep.name != this.name && creep.memory.targetSourceId == this.memory.targetSourceId && this.memory.role == 'transporter') this.memory.replace = false;
            }
        }

        switch (this.transfer(container, RESOURCE_ENERGY)) {
            case OK:
                delete this.memory.dropPointID;
                if (transportTime * 1.05 > this.ticksToLive) {
                    this.recycle();
                } else {
                    this.memory.timeLastTransport = transportTime;
                    this.memory.timeStartTransport = Game.time;
                }
                return;
            case ERR_NOT_IN_RANGE:
                this.travelTo(container.pos, {reusePath: 5, ignoreCreeps: false});
                return;
            case ERR_FULL:
                //this.drop(RESOURCE_ENERGY);
                this.say ('FULL');
                delete this.memory.dropPointID;
                return;
        }
    }
};

Creep.prototype.getSpawnTime = function() {
    return this.body.length * 3;
};

Creep.prototype.runWorker = function () {
    this.idle = false;

    if (!this.room.isSKLair() && this.memory.birthRole == 'colonist' && this.room.find(FIND_HOSTILE_CREEPS).length>0){
        var hasAttackPart = false;
        for (var i=0; i < this.body.length;i++) {
            if (this.body[i].type == ATTACK) hasAttackPart = true;
        }
        if (hasAttackPart) this.doAttack();
        return;
    }

    if (this.carry.energy == 0)
        this.memory.state = 'findEnergy';
    if (this.carry.energy == this.carryCapacity)
        this.memory.state = 'doWork';

    switch(this.memory.state) {
        case 'findEnergy':
            this.doFindEnergy(this);
            break;
        case 'doWork':
            this.doWork(this);
            break;
    }

};

Creep.prototype.fleeFromKeeper = function() {
    let keeper = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5)[0];
    if (keeper == undefined) keeper = this.pos.findInRange(FIND_STRUCTURES, 5, {filter: o=> {return o.structureType == STRUCTURE_KEEPER_LAIR && o.ticksToSpawn <= 5}})[0];
    if (keeper && keeper.pos.inRangeTo(this.pos,4)) {
        this.fleeFrom(keeper);
    }
    if (keeper) return true;
};

Creep.prototype.runHarvester = function() {
    if (this.memory.timeStartTransport == undefined) this.memory.timeStartTransport = Game.time;

    // vluchten van keepers
    if (this.room.isSKLair()) {
        if (this.fleeFromKeeper()) return true;
    }


    //console.log ( 'running harvester ' +this.name)
    var sourceId = this.memory.targetSourceId;
//    if (sourceId === undefined) {
//        sourceId = this.findSource().id;
//        this.memory.sourceId = sourceId;
//    }


    var source = Game.getObjectById(sourceId);
    // move naar source of anders container bij source
    var container;
    if (source) container = source.getContainer();
    var pos;
    if (container) pos = container.pos;
    else if (source) pos = source.pos;
    if (pos == undefined && this.memory.targetRoomName) pos = Game.atlas.getRoomCenter(this.memory.targetRoomName);

    if (this.memory.timeLastTransport == undefined) {
        this.memory.timeLastTransport = Game.time - this.memory.timeStartTransport;
    }


    if (!this.pos.isEqualTo(pos)) this.travelTo(pos);
    else if (this.harvest(source) == OK ) {
        if (!this.memory.timeLastTransport) this.memory.timeLastTransport = Game.time - this.memory.timeStartTransport;
        let scoutInfo = Game.atlas.getScoutInfo(this.room.name);
        scoutInfo.lastHarvest = Game.time;
        this.pos.createConstructionSite(STRUCTURE_CONTAINER);
    }
    let resource = this.pos.lookFor(LOOK_ENERGY)[0];
/*    if (resource){
        this.pickup(resource);
        this.drop(RESOURCE_ENERGY);
    }
*/
    //container bouwen / repairen indien nodig
    if (container && container.hits < container.hitsMax) this.repair(container);
    var constructionSite = this.pos.lookFor(LOOK_CONSTRUCTION_SITES)[0];
    if (constructionSite) this.build(constructionSite);



    // vervangen indien bijna dood
    if (this.memory.timeLastTransport + this.getSpawnTime() > this.ticksToLive) {
        this.memory.replace = true;
        if(this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) => {return creep.memory.role == 'harvester' && creep.memory.targetSourceId == this.memory.targetSourceId}}).length>1) this.suicide();
    }

    // room markeren met homeroom
    this.room.memory.HomeRoomName = this.memory.HomeRoomName;

};

Creep.prototype.fleeFrom = function(object) {
    logger$1.log ('creep.fleefrom' , this.name + ' fleeing');
    logger$1.log('creep.fleefrom', 'fleeing from' + object);
    let path = PathFinder.search(this.pos, {pos: object.pos, range: 5}, {flee:true});
    logger$1.log ('creep.fleefrom', path);
    let result = this.moveByPath(path.path, {flee:true});
    logger$1.log ('creep.fleefrom', result);
    this.say ('FLEE');
};

Creep.prototype.doFindEnergy = function () {
    logger$1.log('creep.dofindenergy', 'findenergy', this.name);
    var creep = this;
    // beschikbare energie zoeken

    // if not a filler, prefer larger energy farther away.
    let largeDroppedEnergy;
    if (this.memory.role != 'filler') largeDroppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (dropped) => {return dropped.amount > 2000
                                                                                                                                        && dropped.resourceType == RESOURCE_ENERGY
                                                                                                                                        && !(dropped.pos.findInRange(FIND_HOSTILE_CREEPS,3).length>0)
                                                                                                                                        }});

    var droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (dropped) => {return dropped.amount  >= 50
                                                                                                && dropped.resourceType == RESOURCE_ENERGY
                                                                                                && !(dropped.pos.findInRange(FIND_HOSTILE_CREEPS,3).length>0)
                                                                                            }});
    var tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (tombstone) => {return tombstone.store.energy  >= 50}});
    var container = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (structure) => {
        return (structure.structureType == STRUCTURE_CONTAINER
        || structure.structureType == STRUCTURE_STORAGE
        || structure.structureType == STRUCTURE_TERMINAL// && (_.sum(structure.store) > TERMINAL_FILL || !structure.isActive() || this.controller.level < 8)
        || (structure.structureType == STRUCTURE_LINK && this.memory.role != 'filler')
        ) && (structure.store && structure.store.energy >= 100 || structure.energy && structure.energy >= 100)
        }});

    //valide targets in array stoppen
    var targets = [];
    if (largeDroppedEnergy) targets = targets.concat(largeDroppedEnergy);
    else {
        if (droppedEnergy) targets = targets.concat(droppedEnergy);
        if (tombstone) targets = targets.concat(tombstone);
        if (container) targets = targets.concat(container);
    }
    var target = creep.pos.findClosestByPath(targets); // dichtbijzijne
    logger$1.log('creep.dofindenergy', target, this.name);

    if (target ) {

        if (target instanceof Resource) {
            if (creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                creep.travelTo(droppedEnergy.pos);
                creep.say ('🤜E' + droppedEnergy.pos.x +' '+ droppedEnergy.pos.y);
            }            return;
        }

        // energie uit tombstone
        if (tombstone == target) {
            if (creep.withdraw(tombstone,RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.travelTo(tombstone.pos);
                creep.say ('🤜T');
                logger$1.log ('creep.dofindenergy' , 'picking up endergy from ts ' +tombstone.name   );
            }
        return;
        }

        if (container == target) {
            if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE )
                this.say ('container');
                creep.travelTo(container.pos);
            return;
        }
    }


    /*
    //in source keeper lairs niet vullen
    if (this.room.isSKLair()) {
        creep.idle=true;
        creep.travelTo(Game.rooms[this.memory.HomeRoomName].controller.pos);
        creep.say('home')
        return;
    }*/

    // energie vinden bij source
    let source;
    if (this.room.isSKLair()) {
        source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {filter: o => { return o.pos.findInRange(FIND_HOSTILE_CREEPS,4).length == 0}});
    } else {
        source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    }

    if (source) {
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.travelTo(source.pos,{visualizePathStyle: {stroke: '#ffff00'}});
            creep.say ('F');
        }
        var container = source.getContainer();
        return;
    }

    // geen energie gevonden, creep is idle
    creep.say ('😴');
    if (this.room.name != this.memory.HomeRoomName) {
        creep.travelTo(Game.rooms[this.memory.HomeRoomName].controller.pos);
        creep.say('home');
    }
    creep.idle = true;
};

Creep.prototype.doWork = function() {
    var creep = this;


    //Emergency controller upgrade!
    target = creep.room.controller;
    if (target && target.ticksToDowngrade <= emergencyUpgradeMin && target.my) this.room.memory.emergencyUpgrade = true;
    if (target && target.ticksToDowngrade >= emergencyUpgradeMax && target.my) this.room.memory.emergencyUpgrade = false;

    if (this.room.memory.emergencyUpgrade) {
        //console.log ('emergency upgrade!')
        creep.upgradeController(target);
        if (!this.pos.isNearTo(target.pos)) creep.travelTo(target,{approach: 3});

        return;
    }


    //console.log('trying fill')
    if (this.room.name == this.memory.HomeRoomName && !this.room.hasFiller()) {
        logger$1.log ('creep.dowork','no filler, foing to fill',this.name);
        if (this.doFill()) return;
    }



    // repairen roads
    logger$1.log ('creep.dowork','trying road repairs',this.name);
    var target = undefined;
    target= creep.pos.findInRange(FIND_STRUCTURES, 0, {filter: (structure) => {
                    return (    structure.structureType == STRUCTURE_ROAD && structure.needsRepair())
                    }
                } )[0];
    if (target) {
        creep.repair(target);
        return;
    }



    //anders constructen
    //console.log ('trying constructions')

    logger$1.log ('creep.dowork','trying construct ',this.name);
    let res = this.room.getStoredEnergy();
    if ( this.room.controller == undefined  // construct if there is no controller (roads/containers)
        || (this.room.controller.level <=2  // construction always allowed if under level 3
            || this.room.getEnergyCapacityAvailable() < 800   // construction always allowed if harvesters cannot be spawned
            || res.capacity < CONSTRUCTION_MIN_STORED_ENERGY // or there is not enough storage capacity
            || res.result >= CONSTRUCTION_MIN_STORED_ENERGY)) { // otherwise if there is enough stored energy not to starve 'fillers'
        target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (target == undefined) { // niet gevonden, flags zoeken
            target = creep.pos.findClosestByPath(FIND_FLAGS,  {filter: o => {return o.color = COLOR_BROWN && o.secondaryColor == COLOR_BROWN}}) ;
            if (target) {
                creep.travelTo(target);
                target.pos.createConstructionSite(STRUCTURE_ROAD);
                target.remove();
            }
        } else {
            //console.log ('going to construction site ' + target )
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.travelTo(target,{visualizePathStyle: {stroke: '#00ff00'}});
            }
            this.say('C');
            return;
        }
    }

    //doorgaan naar bestemming
    logger$1.log ('creep.dowork','trying traveling to interroom destination ',this.name);
    if (this.memory.destination && this.room.name != this.memory.destination.roomName) {
        this.say ('dest');
        this.travelTo (new RoomPosition(this.memory.destination.x, this.memory.destination.y, this.memory.destination.roomName));
        return;
    }

    //werk buiten room vinden (alleen indien level groter dan 2)
    let homeRoom = Game.rooms[this.memory.HomeRoomName];
    if (!this.memory.assignedRoomName && homeRoom.controller && homeRoom.controller.level > 2) {
        logger$1.log ('creep.runworker', 'worker finding room outside for creep ' + this.name);
        var roomNames=Game.rooms[this.memory.HomeRoomName].findHarvestRooms();
        logger$1.log ('creep.runworker', roomNames );
        for (var i=0; i < roomNames.length; i++) {
            var room = Game.rooms[roomNames[i]];
            logger$1.log ('creep.runworker', 'worker finding room, checking room ' + roomNames[i] );
            if (room && room.memory.workerAssignedName == undefined && this.memory.assignedRoomName == undefined && room.find(FIND_FLAGS, {filter: o => {return o.color = COLOR_BROWN && o.secondaryColor == COLOR_BROWN}}).length >0 ) {
                room.memory.workerAssignedName = this.name; //worker assignen
                this.memory.assignedRoomName = roomNames[i];
                i = roomNames.length;
            }
        }
    }

    //move naar construction in geassignde room
    //    console.log ('find construction')
    if (this.memory.assignedRoomName && this.memory.assignedRoomName != this.room.name){
        var target = null;
        var room = Game.rooms[this.memory.assignedRoomName];
    //        console.log ('assigned to room ' + room.name)
        if (room) {
            //gewone construction zoeken
            target=room.find(FIND_CONSTRUCTION_SITES)[0];
            // road flags zoeken
            if (!target) {
                target = room.find(FIND_FLAGS, {filter: o => {return o.color = COLOR_BROWN && o.secondaryColor == COLOR_BROWN}})[0];
            }
            if (!target) { // geen construction sites meer
                delete Memory.rooms[this.memory.assignedRoomName].workerAssignedName;
                delete this.memory.assignedRoomName; // hij kan weer aan een andere room assigned worden
            }
        } else {
            target = Game.atlas.getRoomCenter(this.memory.assignedRoomName);
        }
        //logger.log('creep.dowork', '' this.name)
        this.travelTo (target);
        return;
    }

    if (this.memory.assignedRoomName){
        delete Memory.rooms[this.memory.assignedRoomName].workerAssignedName;
        delete this.memory.assignedRoomName; // hij kan weer aan een andere room assigned worden
    }


    //anders naar huis
    //console.log ('trying home')
    if(this.room.name != this.memory.HomeRoomName && this.memory.HomeRoomName) {
        creep.travelTo(Game.rooms[this.memory.HomeRoomName].controller.pos);
        creep.say('home');
        return;
    }


    //anders upgraden
    // ALS:  level <=2 (nog geen containers)
    //    of er is nog geen storage, dan een minimum vasthouden voor fillen (constructionminstoredenergy)
    //    anders niet upgraden tenzij er ruim genoeg is (workeridleupgrade).
    logger$1.log ('creep.dowork',`trying upgrade. energyAvailable: ${this.room.energyAvailable}, capacity: ${this.room.getEnergyCapacityAvailable()}`,this.name);
    var target = creep.room.controller;
    let result = this.room.getStoredEnergy();
    logger$1.log ('creep.dowork',result,this.name);
    if (target && ((!(this.room.storage && this.room.storage.isActive()) &&  result.result > CONSTRUCTION_MIN_STORED_ENERGY ) || result.result > WORKER_IDLE_UPGRADE || target.level <= 2)) {
        logger$1.log ('creep.dowork',`upgrading`,this.name);
        this.say('U');
        creep.upgradeController(target);
        if (!this.pos.isNearTo(target.pos)) creep.travelTo(target,{visualizePathStyle: {stroke: '#0000ff'}});
        if (this.room.storage && this.room.storage.isActive()) creep.idle = true; // creep is idle als hij gaat upgraden. behalve als er nog geen storage is
        return;
    } else {
        creep.idle = true;
        this.doFill();
        return;
    }
};

Creep.prototype.runInitializer = function() {
    //recyclen indien roomlevel niet 8 is.
    if (this.room.controller.my && this.room.controller.level < 8 ) {
        this.memory.recycle = true;
        return;
    }

    //anders bij roomcontroller unclaimen en opnieuw claimen
    if (this.pos.isNearTo(this.room.controller)) {
        if (this.room.controller.my && this.room.controller.level >= 8) {
            this.room.controller.unclaim();
            return;
        } else if (!this.room.controller.my) {
            this.claimController(this.room.controller);
            return;
        }
    } else this.travelTo (this.room.controller.pos);
    return;
};

// aantal hits repairen van walls (per controller level)
const repairLevel = 10000;

StructureTower.prototype.run = function() {
    //console.log('RUNNING TOWER: ' + this);

    var hostile = this.room.getInvader();
    if (hostile) {
        this.attack(hostile);
        return;
    }
    var creepsHit = this.room.find(FIND_MY_CREEPS, {filter: (creep) => {return (creep.hits < creep.hitsMax );}} );
    if (creepsHit.length > 0) {
        this.heal(this.pos.findClosestByRange(creepsHit));
        return;
    }
    var structuresHit = this.room.find(FIND_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_CONTAINER && structure.hits < structure.hitsMax - 800 && structure.hits < repairLevel * structure.room.controller.level)}});
    if (structuresHit.length > 0) {
        var target = structuresHit[0];
        for(var i = 1;i<structuresHit.length;i++) if (target.hits > structuresHit[i].hits) target = structuresHit[i];
        this.repair(target);
        return;
    }
};

const COLONISATION_DIST = 10;
const COLONISATION_TARGET_RECYCLE_TIME = 5000;
const USERNAME_SOURCEKEEPER = 'Source Keeper';
const ENERGY_HISTORY_LENGTH = 10; // number of approx. days to track energy history of a base and use for average production

const COLONISATION_DIST$1 = 10;
const COLONISATION_TARGET_RECYCLE_TIME$1 = 5000;
const MY_USERNAME$1 = 'Jerdaz';
const USERNAME_SOURCEKEEPER$1 = 'Source Keeper';
const ENERGY_HISTORY_LENGTH$1 = 10; // number of approx. days to track energy history of a base and use for average production

var consts = /*#__PURE__*/Object.freeze({
  COLONISATION_DIST: COLONISATION_DIST$1,
  COLONISATION_TARGET_RECYCLE_TIME: COLONISATION_TARGET_RECYCLE_TIME$1,
  MY_USERNAME: MY_USERNAME$1,
  USERNAME_SOURCEKEEPER: USERNAME_SOURCEKEEPER$1,
  ENERGY_HISTORY_LENGTH: ENERGY_HISTORY_LENGTH$1
});

var consts$1 = ( consts && undefined ) || consts;

/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('spawn');
 * mod.thing == 'a thing'; // true
 */

 
 
 

 const STORE_RESERVE_ENERGY = 50000; // energie vanaf wanneer er een upgrader wordt gemaakt
 const ATTACK_RESERVE_ENERGY = 10000;
 const INITIALIZER_ENERGY = 1200000;
 const SPAWN_UPGRADER_RATIO = 1; // hoeveel upgraders er gemaakt moeten worden per blok 'store_reserver_energy'.
 const BODY_SORT = {'tough': 1, 'move': 2, 'carry': 3, 'work': 4 , 'claim': 5, 'attack': 6, 'ranged_attack': 7, 'heal': 8};


Spawn.prototype.getCreepCost = function (body) {
    var cost = 0;
    for (var i=0; i<body.length;i++) cost += BODYPART_COST[body[i]];
    return cost;
};

//body van een creep repeteren tot beschikbare energy
Spawn.prototype.expandCreep = function(body, minLength = 3, maxLength = MAX_CREEP_SIZE, emergencySpawn = false) {
    logger$1.log('spawn.expandcreep', `${body}, ${minLength}, ${maxLength}` );
    var result = [];
    var i=0;
    var maxEnergy = this.room.getEnergyCapacityAvailable();
    if (emergencySpawn && !this.room.hasWorker() || this.room.getStoredEnergy().result < 50) maxEnergy = this.room.energyAvailable; // emergency respawn als alle creeps dood zijn;
    while (this.getCreepCost(result) <= maxEnergy && result.length < Math.min(maxLength + 1, MAX_CREEP_SIZE + 1)) {
        result.push(body[i++]);
        i = i % body.length;
    }
    result.pop(); // de laatste er altijd uitgooien omdat die energie overschrijdt
    result.sort((partA, partB) => {
        logger$1.log('spawn.expandcreep', partA + partB + BODY_SORT[partA] +' '+BODY_SORT[partB] + BODY_SORT.carry);
        if (BODY_SORT[partA] < BODY_SORT[partB]) return -1;
        if (BODY_SORT[partA] > BODY_SORT[partB]) return 1;
        return 0;
    });

    logger$1.log('spawn.expandcreep', result);
    if (result.length>= minLength) return result;
};

Spawn.prototype.recycleCreeps = function () {
    var creeps = this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) => {return creep.memory.recycle == true}});
    logger$1.log ('spawn.recyclecreeps', creeps);
    for (var creep of creeps) this.recycleCreep(creep);
};

Spawn.prototype.spawnCreepByRole = function (role, targetRoomName, targetSourceId = undefined) {
    // return true indien spawn succesvol
    var newName = role + this.room.name + '_' + targetRoomName + '_' + Game.time % 10000;
    var body;
    var source = Game.getObjectById(targetSourceId);
    logger$1.log('spawn.spawncreepbyrole', 'Trying to spawn ' + role + ' for room ' + targetRoomName );
    let room = Game.rooms[targetRoomName];
    switch(role) {
        case 'scout':
            body = [MOVE];
            break;
        case 'reserver':
            body = [MOVE];
            var ticksToEnd;
            if (room && room.controller && room.controller.reservation) ticksToEnd = room.controller.reservation.ticksToEnd;
            if (!ticksToEnd) ticksToEnd = 0;
            if (room && room.controller && this.room.getEnergyCapacityAvailable() >= BODYPART_COST[MOVE] + BODYPART_COST[CLAIM] && room.find(FIND_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER}}).length > 0) {
                if (ticksToEnd < 3900 && this.room.getEnergyCapacityAvailable() >= BODYPART_COST[MOVE]*2 + BODYPART_COST[CLAIM] * 2) body = [MOVE, MOVE, CLAIM, CLAIM];
                else body = [MOVE, CLAIM];
            } else if (room && room.controller && room.controller.level > 0 && !room.controller.my) body = this.expandCreep([MOVE,CLAIM]);
            break;
        case 'harvester':
            body = [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE];
            let source = Game.getObjectById(targetSourceId);
            if (source.energyCapacity >= 4000) {
                body = [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE,MOVE];
            }

            break;
        case 'transporter':
            let bodyTemplate = [MOVE,CARRY,CARRY];
            var requiredSize = 1.05 * Math.ceil(Memory.transportLoad[targetSourceId] / 100); //transporter moet minimaal de actuele load  kunnen dragen.
//            let energyDivider = Math.ceil((requiredSize * this.getCreepCost(bodyTemplate)) / this.room.getEnergyCapacityAvailable()) // indien niet genoeg energy, dan halve creeps maken zodat er dubbele tranporters komen
//            let bodySizeDivider = Math.ceil(3*requiredSize / MAX_CREEP_SIZE) // indien te klein voor maximum size, kleiner maken zodat er meer gespawned worden
//            let divider = Math.max(energyDivider,bodySizeDivider)
            let maxLength = (3*requiredSize);// / divider
            if (!maxLength) maxLength = MAX_CREEP_SIZE;
//            logger.log('spawn.spawncreepbyrole', `maxLength: ${maxLength} requiredsize: ${requiredSize} energyDivider: ${energyDivider} bodysizeDivider: ${bodySizeDivider}`)
            body = this.expandCreep(bodyTemplate, 2, maxLength);
            break;
        case 'attacker':
            let spawnFodder;
            if (room) {
                spawnFodder = false;
                let towers = room.find(FIND_HOSTILE_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_TOWER}});
                logger$1.log('spawn.spawncreepbyrole', 'room  visible towers: ' + towers.length);
                for (let tower of towers) if (tower.energy >= 100) spawnFodder = true;
                if (room.find(FIND_MY_CREEPS).length > 10) spawnFodder = false;
            } else {
                let scoutInfo = Game.atlas.getScoutInfo(targetRoomName);
                if (scoutInfo && scoutInfo.towerCount > 0) spawnFodder = true;
            }
            if (spawnFodder) {
                body = [MOVE];
            } else {
                body = this.expandCreep([MOVE, ATTACK], 2);
            }
            break;
        case 'upgrader':
            if (this.room.controller && this.room.controller.level >= 8) {
                body = this.expandCreep([MOVE,CARRY,WORK,WORK,WORK,MOVE,WORK,WORK,WORK,WORK], 23, 23 );
            }
            else if (this.room.getLinks().length >= 2 ) {
                body = this.expandCreep([MOVE,CARRY,WORK,WORK,WORK,MOVE,WORK,WORK,WORK,WORK]);
            } else {
                body = this.expandCreep([MOVE,CARRY,WORK]);
            }
            break;
        case 'initializer':
            body = [MOVE,CLAIM];
            break;
        case 'keeperkiller':
            body = _.fill(Array(25), MOVE);
            body = body.concat(_.fill(Array(20), RANGED_ATTACK));
            body = body.concat(_.fill(Array(5), HEAL));
            //body = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,HEAL,HEAL,HEAL,HEAL,HEAL];
            break;
    }
    logger$1.log('spawn.spawncreepbyrole', 'body: '+ body);
    if(this.spawnCreep(body, newName, {memory: {role: role, targetSourceId: targetSourceId, targetRoomName: targetRoomName, HomeRoomName: this.room.name}}) == OK) {
        //console.log ('Spawned ' + role + ': ' + newName);
        if (role == 'harvester' && source) this.buildPath(source.pos, false);
        return true;
    }
    return false;
};

Spawn.prototype.replaceCreeps = function() {
    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        if (creep.memory.replace && !creep.memory.replaced && creep.memory.HomeRoomName == this.room.name) {
            if (this.spawnCreepByRole(creep.memory.role, creep.memory.targetRoomName, creep.memory.targetSourceId)) {
                logger$1.log('spawn.replacecreeps', 'replacing creep: ' + creep.name);
                creep.memory.replaced = true;
            }
            return true;
        }
    }
};


Spawn.prototype.calculateAvgWorkers = function(roomCreeps) {
    //idle workers uitrekeningen
    var workerCreeps=_.filter(roomCreeps, (creep) => {return creep.memory.role == 'worker'});
    // dode en vertrokken en nieuwe worker creeps meenemen in running avg
    if (this.memory.lastWorkerCount == undefined) this.memory.lastWorkerCount = 0;
    var lastWorkerCount = this.memory.lastWorkerCount;
    if (lastWorkerCount != workerCreeps.length) {
        for ( var i=0; i< this.room.memory.avgIdleWorkers.length;i++) this.room.memory.avgIdleWorkers[i]-= lastWorkerCount - workerCreeps.length; // dode creep meenemen in verwachte idle berekening
    }
    this.memory.lastWorkerCount = workerCreeps.length;
    var idleWorkers=0;
    if (this.memory.idleWorkerCounter == null) this.memory.idleWorkerCounter = 0;
    for (var i=0; i<workerCreeps.length;i++) if (workerCreeps[i].idle == true) idleWorkers++;
    this.room.memory.avgIdleWorkers[Game.time % this.room.memory.avgIdleWorkers.length] = idleWorkers;
    var runningAvgIdleWorkers = 0;
    for(var i=0;i<this.room.memory.avgIdleWorkers.length;i++) runningAvgIdleWorkers += this.room.memory.avgIdleWorkers[i] / this.room.memory.avgIdleWorkers.length;

    if (this.memory.idlePerc == undefined) this.memory.idlePerc = 0.5;
    if (this.spawning) this.memory.idlePerc = this.memory.idlePerc / 1500 * 1499;
    else  this.memory.idlePerc = this.memory.idlePerc / 1500 * 1499 + 1 / 1500;
    logger$1.log('spawn.calculateavgworkers', `RUNNING SPAWN ${this.room.name}: Idle: ${Math.round(this.memory.idlePerc * 100)}% Workers: ` + workerCreeps.length + ' idleworkercounter: ' + idleWorkers + ' Running avg: ' + runningAvgIdleWorkers);
    return runningAvgIdleWorkers;
};

Spawn.prototype.run = function(roomCreeps, runningAvgIdleWorkers) {
    logger$1.log ('spawn.run', 'Running spawn in room ' + this.room);

    //this.recycleCreeps();

    // attack
    let attacking = false;
    let attackFlags = myflags$1.getAttackFlags();
    if (this.room.getStoredEnergy().result > ATTACK_RESERVE_ENERGY) {
        if (attackFlags.length > 0) {
            attacking = true;
        }
    }


    //attacker maken als er al een staat te wachten
    /*
    if (this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) => {return creep.memory.role=='attacker' && !creep.memory.startAttack}}).length == 1) {
        this.spawnCreepByRole('attacker');
        return;
    }*/

    //workers spawnen
    var harvestRooms = this.room.findHarvestRooms();
   //6 goto (skipdefender);

   //defenders maken (max 2 per room)

   if (_.filter(roomCreeps, o => {return o.memory.role == 'defender'}).length < 2 ) {
        for(var i=0;i<harvestRooms.length;i++) {


            var roomName = harvestRooms[i];

            // if room is in the center of a sector it spawns very strong defenders. it is a waste of resources
            // to defend from it.
            var roomXY = Game.atlas.getRoomCoordinates(roomName);
            if (roomXY.x % 10 == 5 && roomXY.y % 10 == 5) continue;

            var room = Game.rooms[roomName];

            // defenders maken indien aangevallen
            let hostileCreeps;
            if (room) hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {filter: o => {return o.owner.username != 'Source Keeper'}});
            if (room && hostileCreeps.length>0) {
                //let maxBodySize = 0;
                //for (creep of hostileCreeps) if (creep.body.length > maxBodySize) maxBodySize = creep.body.length;
                var newName = 'Defender' + Game.time;
                //console.log('SPAWNING DEFENDER (invader in room: ' + room )
                if(this.spawnCreep(this.expandCreep([MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,HEAL],4), newName, {memory: {role: 'defender', HomeRoomName: this.room.name}})==OK) console.log('SPAWNED DEFENDER');
                return;
            }
        }
    }


    // initialiser voor als level 8 met upgrade beperking en storage / terminal is vol
    if (this.room.controller.level >= 8 && this.room.getStoredEnergy().result > INITIALIZER_ENERGY) {
        // eerst veel upgraders spawnen
        if (_.filter(roomCreeps, o => {return o.memory.role == 'upgrader'}).length < 9) {
            this.spawnCreepByRole('upgrader');
            return;
        } else if(_.filter(roomCreeps, o => {return o.memory.role == 'initializer'}).length < 1) {
            this.spawnCreepByRole('initializer');
            return;
        }
    }


    // worker spawnen zelf spawenen
    // indien de room een storage heeft, workers maximeren op 3 (upgraders nemen dan de rol over)
        if (!attacking && runningAvgIdleWorkers < 0.5 && (!this.room.hasFiller() || _.filter(roomCreeps, o => {return o.memory.role == 'worker'}).length <= 3) ) {
            var newName = 'Worker' + Game.time;
            //console.log('SPAWNING WORKER')
            if (this.spawnCreep(this.expandCreep([MOVE,WORK,CARRY], 3, MAX_CREEP_SIZE, true), newName,
                {memory: {role: 'worker', HomeRoomName: this.room.name}}) == OK) {
                //console.log('Spawned new worker: ' + newName);
            }
            return;
        }
//    }


    //console.log('harvestrooms: ' + harvestRooms)

    if (this.room.controller && this.room.controller.level < 3) return ; // pas bij level 3 geavanceerde creeps maken



    //filler maken
    if (_.filter(roomCreeps, o => {return o.memory.role == 'filler'}).length < 2 && _.find(roomCreeps, o => {return o.memory.role == 'harvester'})) {
        var newName = 'Filler' +Game.time;
        var size = Math.ceil(this.room.getEnergyCapacityAvailable() / 100 / 2) * 3;
        let result = this.spawnCreep(this.expandCreep([MOVE,CARRY,CARRY], 3, size), 'Filler' + Game.time, {memory: {role: 'filler', HomeRoomName: this.room.name}});
        console.log('SPAWNING FILLER ' + result);
            if(result == OK) {
                console.log ('Spawned Filler: ' + newName);
            }
            return;
        }

    // attack
    if (attacking) {
        this.spawnCreepByRole('attacker', attackFlags[0].pos.roomName);
        return;
    }

    //scout spawnen
    let scoutCreepFound = false;
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        if (creep.memory.role == 'scout' && creep.memory.HomeRoomName == this.room.name) {
            scoutCreepFound = true;
            break;
        }
    }
    if (!scoutCreepFound) {
        this.spawnCreepByRole('scout');
        return;
    }

    //colonizer spawnen

/*    var yellowFlags = []; // colonize flag
    for (var flagname in Game.flags) {
        var flag = Game.flags[flagname];
        if (flag.color==COLOR_YELLOW && flag.name.startsWith(this.room.name)) yellowFlags.push(flag);
    }*/
    if (Memory.colRoom && this.room.getEnergyCapacityAvailable() > 700 && Game.map.findRoute(this.room.name, Memory.colRoom).length <= consts$1.COLONISATION_DIST) {
//        var flag = yellowFlags[0]
        var needCreep=1; // 5 creeps produceren
        var creepBody;
        var room = Game.rooms[Memory.colRoom];
        if (room) { // ik heb al zicht op de kamer
            if (room.controller.my && room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_SPAWN}}).length>0) {
                delete Memory.colRoom; // colonisatie voltooid!
                needCreep = false;
            } else if (!room.controller.my) {
                creepBody = [MOVE,MOVE,CLAIM]; // claimer colonist (leeft kort veel move)
                needCreep = 2; // beetje overbodig maar anders duur het te lang voor de sterke creep doodgaat.
            }
            else {
                creepBody = this.expandCreep ([MOVE,WORK,MOVE,CARRY,MOVE,ATTACK]); // externe worker tot spawn er staat
                needCreep = 7; // colonist verandert in worker als hij arriveert.
            }
        } else {
            creepBody = [MOVE]; // sterke verkenner / padmaker
            needCreep = 1; // max 1 tegelijk
        }
        var creepcount = 0;
        for (var creepname in Game.creeps) {
            var creep=Game.creeps[creepname];
            if (creep.memory.birthRole == 'colonist') creepcount++;
        }
        if (creepcount>=needCreep) needCreep=false;

        if (needCreep) {
            var newName =  'Colonist' + Game.time;
            if(this.spawnCreep(creepBody, newName, {memory: {role: 'colonist', birthRole: 'colonist', HomeRoomName: this.room.name}}) == OK) {
                console.log ('Spawned Colonist: ' + newName);
            }
            return;
        }
    }



    //upgrader voor lokale controller
    //console.log ('SPAWN: Upgraders')
    let controllerContainer = this.room.controller.getContainer();
    let storedEnergy = this.room.getStoredEnergy().result;
    if ((storedEnergy > STORE_RESERVE_ENERGY) || (this.room.storage == undefined && this.room.find(FIND_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER && _.sum(structure.store) == structure.storeCapacity}}).length > 0)) {
        var needCreep;
        if (this.room.controller && this.room.controller.level >= 8) needCreep = 1;
        else if (this.room.storage) needCreep = (storedEnergy - STORE_RESERVE_ENERGY) / (STORE_RESERVE_ENERGY * SPAWN_UPGRADER_RATIO);
        else if (this.room.find(FIND_CONSTRUCTION_SITES).length>0) needCreep = 0;
        else needCreep = 50;
        var creepcount = 0;
        for (var creepname in Game.creeps) {
            var creep=Game.creeps[creepname];
            if (creep.memory.role == 'upgrader' && creep.memory.HomeRoomName == this.room.name) creepcount++;
        }
        if (creepcount>=needCreep) needCreep=false;

        if (needCreep) {
            this.spawnCreepByRole('upgrader');
            return;
        }
    }



    //harvester en transporter spawnen.
    //lokale sources
    var sources =[]; //= this.room.findSources();


//    sources in harvest areas erbij
    for(var i=0;i<harvestRooms.length;i++) {
        if (!Memory.rooms[harvestRooms[i]]) continue;
        let scoutInfo = Game.atlas.getScoutInfo(harvestRooms[i]);
        if (scoutInfo == undefined) continue;
        for (let sourceId in scoutInfo.sources) {
            let smallestDistance = 999999;
            let sourceInfo = scoutInfo.sources[sourceId];
            for (let roomName in sourceInfo.roomDistance) {
                if (sourceInfo.roomDistance[roomName] < smallestDistance) smallestDistance = sourceInfo.roomDistance[roomName];
            }
            if (sourceInfo.roomDistance && sourceInfo.roomDistance[this.room.name] == smallestDistance) {
                //sources.push(Game.getObjectById(sourceId));
                sources.push({sourceId: sourceId, distance: smallestDistance, roomName: harvestRooms[i]});
            }
        }
    }
    sources.sort((a,b) => {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        else return 0;
    });
    logger$1.log('spawn.run', sources);

    for(var i=0;i< sources.length;i++) {

        // creeps replacen
        for (let creep of roomCreeps) {
            if (creep.memory.replace && !creep.memory.replaced && creep.memory.targetSourceId == sources[i].sourceId) {
                if (this.spawnCreepByRole(creep.memory.role, creep.memory.targetRoomName, creep.memory.targetSourceId)) {
                    logger$1.log('spawn.replacecreeps', 'replacing creep: ' + creep.name);
                    creep.memory.replaced = true;
                }
                return true;
            }
        }
        let source = Game.getObjectById(sources[i].sourceId);

        // reserver maken indien nodig (geen zicht)
        if (this.room.name != sources[i].roomName) {
            let hasReserver = false;
            for (let creep of roomCreeps) {
                if (creep.memory.role == 'reserver' && creep.memory.targetRoomName == sources[i].roomName) {
                    hasReserver = true;
                    break;
                }
            }
            if (!hasReserver) {
                this.spawnCreepByRole('reserver', sources[i].roomName);
                return;
            }
        }

        if (source) {
            logger$1.log('spawn.run', 'spawning creeps for room ' + source.room.name + ' source: ' + source.id);
            if (Game.atlas.getScoutInfo(source.room.name).hasKeepers) {
                logger$1.log('spawn.run', 'checking if keeperkiller exists');
                let hasKeeperKiller = false;
                for (let creep of roomCreeps) {
                    if (creep.memory.role == 'keeperkiller' && creep.memory.targetRoomName == sources[i].roomName) {
                        hasKeeperKiller = true;
                        break;
                    }
                }
                if (!hasKeeperKiller) {
                    this.spawnCreepByRole('keeperkiller', sources[i].roomName);
                    return;
                }

                //continue; // tijdelijk overslaan totdat cleaner goed werkt nog geen harvesters maken;
            }

            let transportContainer = source.getContainer();
            var needHarvester=true;
            logger$1.log ('spawn.run', 'trying to spawn harvester for room ' + source.room.name + ' and source ' +source.id);
            for (var creepname in Game.creeps) {
                var creep=Game.creeps[creepname];
                if (creep.memory.role == 'harvester' && creep.memory.targetSourceId == source.id) {
                logger$1.log ('spawn.run', 'found harvester, stopping spawn ' +  creep.name);
                    needHarvester =false;
                }
            }

            if (needHarvester) {
                logger$1.log ('spawn.run', 'room needs harvester calling spawncreepbyrole ' + source.room.name);
                //console.log ('TRYING HARVESTER ' + source.room.name)
                this.spawnCreepByRole('harvester', source.room.name, source.id);
                return;
            }
            var needTransporter=true;
            if (Memory.lastSourceNewTransportSpawn == undefined) Memory.lastSourceNewTransportSpawn = {};

            let lastSpawnTime = Memory.lastSourceNewTransportSpawn[source.id];
            if (Game.time - lastSpawnTime < 750) needTransporter = false;

            //console.log ('SPAWN: Transporter ' + source.room.name)
            if (needTransporter) {
                for (var creepname in Game.creeps) {
                    var creep=Game.creeps[creepname];
                    if (creep.memory.role == 'transporter' && creep.memory.targetSourceId == source.id && transportContainer && transportContainer instanceof StructureContainer && transportContainer.store.energy < transportContainer.storeCapacity )
                        needTransporter =false;
                }
            }

            if (needTransporter && transportContainer && transportContainer instanceof StructureContainer) { // ook al is er een transporter nodig, alleen als de source een container heeft
                if (this.spawnCreepByRole('transporter', source.room.name, source.id)) {
                    Memory.lastSourceNewTransportSpawn[source.id] = Game.time;
                }
                return;
            }
//            else if (needTransporter) {
//                console.log ('Spawner idle: Need container in room ' + source.room)
//                return;
//            }
        }

    }
    //console.log ('SPAWN: Idle...Zz')

/*    //transporters spawnen
    var idleTransporters=0;
    var creeps=this.room.find(FIND_MY_CREEPS,{filter: (creep) => {return creep.memory.role == 'transporter'}});
    if (this.memory.idleTransporterCounter == null) this.memory.idleTransporterCounter = 0;
    for (var i=0; i<creeps.length;i++) if (creeps[i].idle == true) idleTransporters++;
    this.room.memory.avgIdleTransporters[Game.time % this.room.memory.avgIdleTransporters.length] = idleTransporters;
    var runningAvgIdleTransporters = 0;
    for(var i=0;i<this.room.memory.avgIdleTransporters.length;i++) runningAvgIdleTransporters += this.room.memory.avgIdleTransporters[i] / this.room.memory.avgIdleTransporters.length;
    console.log('RUNNING SPAWN: Transporters: ' + creeps.length + ' idle: ' + idleTransporters + ' idleTransporterscounter: ' + idleTransporters + ' Running avg: ' + runningAvgIdleTransporters);
    if ((this.memory.creephasdied == true && runningAvgIdleTransporters < 1.5) || runningAvgIdleTransporters < 0.5) {
        var newName = 'Transporter' + Game.time;
        if (this.spawnCreep([CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE], newName,
            {memory: {role: 'transporter'}}) == OK);
            console.log('Spawned new transporter: ' + newName);
            //meenemen in verwachte idle berekening
            for ( var i=0; i< this.room.memory.avgIdleTransporters.length;i++) this.room.memory.avgIdleTransporters[i]+=1;
        return;

    } else if (this.memory.creephasdied == true) for ( var i=0; i< this.room.memory.avgIdleTransporters.length;i++) this.room.memory.avgIdleTransporters[i]-=1; // dode creep meenemen in verwachte idle berekening
*/
};

StructureLink.prototype.run = function () {
    if (this.isSource == undefined) {
        if (this.pos.findInRange(FIND_STRUCTURES, 2, { filter: (structure) => { return structure.structureType == STRUCTURE_CONTROLLER; } }).length > 0)
            this.isSource = false;
        else
            this.isSource = true;
    }
    if (this.isSource && this.room.controller) {
        this.transferEnergy(this.room.controller.pos.getNearestLink());
    }
    return;
};

//const destination = 'W8N46'
//const TERMINAL_
StructureTerminal.prototype.run = function (myBases) {
    log('structureterminal.run', 'running terminal ' + this.room.name);
    if (this.room.controller && this.room.controller.level >= 8 && this.store.energy > 100000) {
        log('structureterminal.run', 'Terminal trying to send energy');
        log('structureterminal.run', myBases);
        //logger.log ('structureterminal.run', myRooms[0].terminal )
        let targetRooms = _.filter(myBases, o => { return o.room.terminal && o.room.controller && o.room.controller.level < 8 && o.room.terminal.store.energy < 250000; });
        log('structureterminal.run', targetRooms);
        if (targetRooms.length == 0)
            return; // geen rooms om naar te sturen
        targetRooms.sort((a, b) => {
            let a_distance = Game.map.getRoomLinearDistance(this.room.name, a.room.name, true);
            let b_distance = Game.map.getRoomLinearDistance(this.room.name, b.room.name, true);
            if (a_distance < b_distance)
                return -1;
            if (a_distance > b_distance)
                return 1;
            return 0;
        });
        let destination = targetRooms[0].room.name;
        log('structureterminal.run', 'sending ' + 10000 + ' to ' + destination);
        let result = this.send(RESOURCE_ENERGY, 10000, destination);
        log('structureterminal.run', result);
    }
};

const maxHarvestDistance = 3;
const allies = [''];
const HARVEST_DEFENSE_TIME = 3000;
const KEEPER_HARVESTING = true; // wel of geen keeper lairs harvesten (is nog experimenteel)
const MIN_STORAGE_ENERGY = 25000; // the minimum amount of energy in the main storage, before transporters start dropping energy in other droppoints (like terminals)
const MY_CONTROLLER_STRUCTURES = {
    "spawn": { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3 },
    "extension": { 0: 0, 1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60 },
    "link": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3, 7: 4, 8: 6 },
    "road": { 0: 2500, 1: 2500, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
    "constructedWall": { 1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
    "rampart": { 1: 0, 2: 2500, 3: 2500, 4: 2500, 5: 2500, 6: 2500, 7: 2500, 8: 2500 },
    "storage": { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
    "tower": { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6 },
    "observer": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
    "powerSpawn": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
    "extractor": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1 },
    "terminal": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 },
    "lab": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3, 7: 6, 8: 10 },
    "container": { 0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5 },
    "nuker": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1 }
};
Room.prototype.rememberRoom = function () {
    let scoutInfo = Game.atlas.getScoutInfo(this.name);
    // niet veranderende scoutinfo alleen eerste keer of bij nieuwe structuur
    if (scoutInfo == undefined || scoutInfo.version == undefined || scoutInfo.version < 2) {
        this.memory.scoutInfo = {};
        scoutInfo = this.memory.scoutInfo;
        scoutInfo.hasKeepers = this.find(FIND_HOSTILE_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_KEEPER_LAIR; } }).length > 0;
        scoutInfo.sourceCount = this.find(FIND_SOURCES).length;
        scoutInfo.hasController = (this.controller != undefined);
        scoutInfo.towerCount = this.find(FIND_HOSTILE_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_TOWER; } }).length;
        scoutInfo.sources = {};
        for (let source of this.find(FIND_SOURCES)) {
            scoutInfo.sources[source.id] = { pos_x: source.pos.x, pos_y: source.pos.y };
        }
        scoutInfo.version = 2;
    }
    scoutInfo.lastSeen = Game.time;
    if (this.controller)
        scoutInfo.level = this.controller.level;
    else
        scoutInfo.level = 0;
    if (this.controller && this.controller.owner)
        scoutInfo.ownerUserName = this.controller.owner.username;
    if (this.controller)
        scoutInfo.myRoom = this.controller.my;
    else
        scoutInfo.myRoom = false;
    scoutInfo.hasEnemyCreeps = this.find(FIND_HOSTILE_CREEPS, { filter: (o) => { return o.owner.username != USERNAME_SOURCEKEEPER; } }).length > 0;
};
RoomObject.prototype.reservedEnergy = 0;
Room.prototype.hasFiller = function () {
    return this.find(FIND_MY_CREEPS, { filter: (creep) => { return creep.memory.role == 'filler'; } }).length > 0;
};
Room.prototype.hasWorker = function () {
    return this.find(FIND_MY_CREEPS, { filter: (creep) => { return creep.memory.role == 'worker'; } }).length > 0;
};
Room.prototype.countFillers = function () {
    return this.find(FIND_MY_CREEPS, { filter: (creep) => { return creep.memory.role == 'filler'; } }).length;
};
Room.prototype.hasHarvester = function () {
    return this.find(FIND_MY_CREEPS, { filter: (creep) => { return creep.memory.role == 'harvester'; } }).length > 0;
};
Room.prototype.isSKLair = function () {
    if (this.name === 'sim')
        return false;
    let parsed;
    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(this.name);
    let fMod = parsed[1] % 10;
    let sMod = parsed[2] % 10;
    let isSK = !(fMod === 5 && sMod === 5) &&
        ((fMod >= 4) && (fMod <= 6)) &&
        ((sMod >= 4) && (sMod <= 6));
    return isSK;
};
Room.prototype.isValidHarvestRoom = function (roomName, baseLevel) {
    var room = Game.rooms[roomName];
    var validHarvest = true;
    var validPassage = true;
    let scoutInfo = Game.atlas.getScoutInfo(roomName);
    if (scoutInfo) {
        if (scoutInfo.hasEnemyCreeps) {
            validHarvest = false;
            validPassage = false;
        }
        if (scoutInfo.sourceCount == 0)
            validHarvest = false;
        //if (scoutInfo.controllerLevel > 0 && ! scoutInfo.myRoom) validHarvest = false;
        if (Game.time - scoutInfo.lastHarvest < HARVEST_DEFENSE_TIME) {
            validHarvest = true;
            validPassage = true;
        }
        if (scoutInfo.hasKeepers && (baseLevel < 7 || !KEEPER_HARVESTING))
            validHarvest = false;
        if (room && this != room && room.controller && room.controller.my)
            validHarvest = false;
    }
    else {
        validHarvest = false;
        validPassage = false;
    }
    //xawirxes unscoutable room
    //if (roomName == 'W12N56') validHarvest = false;
    //ontoegankelijke room, pathfinding issues
    //if (roomName == 'W3N57') validHarvest = false;
    //roadbuild pathfinder issue, weg wordt te lang
    //if (roomName == 'W14N51') validHarvest = false;
    //keeper lair
    //if (roomName == 'W15N55') validHarvest = false;
    //if (roomName == 'W14N55') validHarvest = false;
    return { validHarvest: validHarvest, validPassage: validPassage };
};
Room.prototype._fhrCache = [];
Room.prototype.findHarvestRooms = function () {
    //uit cache halen indien mogelijk
    if (this._fhrCache[this.name] && Game.time - this._fhrCache[this.name].gameTime < 1000)
        return this._fhrCache[this.name].result;
    var roomDist = new Map();
    roomDist.set(this.name, 0);
    var depth = 0;
    var result = [this.name];
    while (depth < maxHarvestDistance) {
        for (var [roomName, dist] of roomDist) {
            if (dist == depth) {
                log('room.findharvestrooms', 'checking room ' + roomName + ' at distance ' + depth);
                var exits = Game.map.describeExits(roomName);
                for (var exitkey in exits) {
                    var roomName = exits[exitkey];
                    var curRoomDist = roomDist.get(roomName);
                    if ((curRoomDist == undefined || curRoomDist > depth + 1)) {
                        let resultVal = this.isValidHarvestRoom(roomName, this.controller.level);
                        if (resultVal.validPassage) {
                            // resultaat opslaan
                            log('room.findharvestrooms', 'adding room ' + roomName + ' at distance ' + (depth + 1));
                            roomDist.set(roomName, depth + 1);
                            if (resultVal.validHarvest) {
                                result.push(roomName);
                            }
                        }
                    }
                }
            }
        }
        depth++;
    }
    for (let roomName of result) {
        // source afstanden uitrekenen
        let scoutInfo = Game.atlas.getScoutInfo(roomName);
        if (scoutInfo) {
            for (let sourceId in scoutInfo.sources) {
                log('room.findharvestrooms', 'adding distance for source ' + sourceId);
                let pathSource;
                if (this.getSpawn()) {
                    pathSource = this.getSpawn().pos;
                }
                else {
                    pathSource = Game.atlas.getRoomCenter(this.name); // indien er (nog) geen spawn is, dan midden van de kamer nemen
                }
                let result = PathFinder.search(pathSource, { pos: new RoomPosition(scoutInfo.sources[sourceId].pos_x, scoutInfo.sources[sourceId].pos_y, roomName), range: 1 }, { maxOps: 20000 });
                if (result) {
                    if (scoutInfo.sources[sourceId].roomDistance == undefined)
                        scoutInfo.sources[sourceId].roomDistance = {};
                    scoutInfo.sources[sourceId].roomDistance[this.name] = result.path.length;
                }
            }
        }
    }
    log('room.findharvestrooms', result);
    this._fhrCache[this.name] = { result: result, gameTime: Game.time };
    return result;
};
Room.prototype.getInvader = function () {
    var invaders = this.find(FIND_HOSTILE_CREEPS, { filter: (creep) => {
            for (let ally of allies)
                if (creep.owner.username == ally)
                    return false;
            return true;
        } });
    var target = invaders[0];
    var targetHealParts = 0;
    for (var invader of invaders) {
        var body = invader.body;
        var healParts = 0;
        for (var bodyPart of body)
            if (bodyPart.type == HEAL)
                healParts++;
        if (healParts < targetHealParts) {
            target = invader;
            targetHealParts = healParts;
        }
    }
    return target;
};
Room.prototype.getStoredEnergy = function () {
    let result = 0;
    let capacity = 0;
    if (this.storage && this.storage.isActive()) {
        result += this.storage.store.energy;
        capacity += this.storage.storeCapacity;
    }
    if (this.terminal && this.terminal.isActive()) {
        result += this.terminal.store.energy;
        capacity += this.terminal.storeCapacity;
    }
    else {
        for (let container of this.getContainers()) {
            result += container.store.energy;
            capacity += container.storeCapacity;
        }
    }
    return { result: result, capacity: capacity };
};
Room.prototype.getContainers = function () {
    return this.find(FIND_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_CONTAINER; } });
};
Room.prototype.autoBuild = function () {
    if (this.controller == undefined || this.controller.level < 2) {
        // vijandelijke structures afbreken
        let structures = this.find(FIND_STRUCTURES);
        for (let structure of structures) {
            if (structure.owner && !structure.my)
                structure.destroy();
        }
        return; // indien geen controller, niet builden
    }
    if (Game.time % 300 != 0 && this.name != '')
        return; //maar 1x per 100 turn autobuilden
    if (this.getSpawn() == undefined)
        return;
    log('room.autobuild', 'autobuilding room ' + this.name);
    //niet autobouwen als er nog iets te bouwen is;
    if (this.find(FIND_MY_CONSTRUCTION_SITES).length > 0)
        return;
    var structures = this.find(FIND_STRUCTURES);
    log('room.autobuild', 'building structures');
    //gebouwen maken
    var structuretypes = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER, STRUCTURE_TOWER, STRUCTURE_LINK, STRUCTURE_TERMINAL];
    let nonBaseContainerCount = 0;
    let nonBaseLinkCount = 0;
    if (this.controller.getContainer())
        nonBaseContainerCount++;
    if (this.controller.pos.findInRange(FIND_MY_STRUCTURES, 2, { filter: (structure) => { return structure.structureType == STRUCTURE_LINK; } }).length > 0)
        nonBaseLinkCount++;
    for (source of this.findSources())
        if (source.getContainer())
            nonBaseContainerCount++;
    //logger.log ('room.autobuild', 'nonbasecount container: ' + nonBaseContainerCount)
    for (var i = 0; i < structuretypes.length; i++) {
        var countStructures = 0;
        for (var j = 0; j < structures.length; j++) {
            if (structures[j].structureType == structuretypes[i]) {
                countStructures++;
                //logger.log('room.autobuild', 'building found' + structuretypes[i])
            }
        }
        var max_default_structures = MY_CONTROLLER_STRUCTURES[structuretypes[i]];
        var max_structures = max_default_structures[this.controller.level];
        if (structuretypes[i] == STRUCTURE_CONTAINER) {
            if (this.controller.level >= 3)
                max_structures = Math.min(2 + nonBaseContainerCount, max_structures);
            else
                max_structures = 0;
        }
        if (structuretypes[i] == STRUCTURE_LINK)
            max_structures = Math.min(1 + nonBaseLinkCount, max_structures);
        if (countStructures < max_structures) {
            //console.log (structuretypes[i])
            var pos = this.findBuildingSpot();
            log('room.autobuild', 'buildingspot: ' + pos + ' ' + structuretypes[i] + ' ' + max_structures + ' ' + countStructures);
            this.createConstructionSite(pos, structuretypes[i]);
            //roads om gebouw heen maken
            this.createConstructionSite(pos.x + 1, pos.y, STRUCTURE_ROAD);
            this.createConstructionSite(pos.x - 1, pos.y, STRUCTURE_ROAD);
            this.createConstructionSite(pos.x, pos.y + 1, STRUCTURE_ROAD);
            this.createConstructionSite(pos.x, pos.y - 1, STRUCTURE_ROAD);
            break;
        }
    }
    log('room.autobuild', 'building roads');
    //infra bouwen (wegen containers)
    if (this.controller.level >= 2) {
        // weg naar controller bouwen, indien voldoende spawn capaciteit voor upgrader. vanaf level 3 een container, level 5 een link en level 6 een terminal)
        if (this.getEnergyCapacityAvailable() >= 550)
            this.getSpawn().buildPath(this.controller.pos, (this.controller.level >= 3), (this.controller.level >= 5), (this.controller.level >= 6 && this.controller.level < 8));
        for (var source of this.find(FIND_SOURCES)) {
            //logger.log('room.autobuild', 'buildingpath from to: ' )
            this.getSpawn().buildPath(source.pos, this.controller.level >= 3);
            this.controller.buildPath(source.pos, false);
        }
    }
    //rebuild roads that may have fallen
    for (let structure of this.find(FIND_MY_STRUCTURES)) {
        if (structure.structureType == STRUCTURE_CONTROLLER)
            continue;
        let pos = structure.pos;
        let buildRoad = function (room, x, y) { if (room.getTerrain().get(x, y) != TERRAIN_MASK_WALL)
            room.createConstructionSite(x, y, STRUCTURE_ROAD); };
        buildRoad(this, pos.x + 1, pos.y);
        buildRoad(this, pos.x - 1, pos.y);
        buildRoad(this, pos.x, pos.y + 1);
        buildRoad(this, pos.x, pos.y - 1);
    }
    //destroy structures not near main base that should be there
    // currently: move the terminal within range of the base.
    if (this.controller.level == 8) {
        let centerPos = this.getSpawn().pos;
        let structures = this.find(FIND_MY_STRUCTURES);
        for (let structure of structures) {
            if (structure.structureType == STRUCTURE_TERMINAL
                && structure.pos.getRangeTo(centerPos) > 12) {
                structure.destroy();
            }
        }
    }
};
Room.prototype.findBuildingSpot = function () {
    //console.log('FINDBUILDINGSPOT')
    var spawn = this.getSpawn();
    var x = spawn.pos.x;
    var y = spawn.pos.y;
    var i = 1;
    var x;
    var y;
    loop: while (i < 50) {
        for (x = -1 * i; x <= 1 * i; x++) {
            for (y = -1 * i; y <= 1 * i; y++) {
                //console.log(x + ' ' +  y)
                if ((x + y) % 2 == 0 && this.validBuildingSpot(spawn.pos.x + x, spawn.pos.y + y))
                    break loop;
            }
        }
        i++;
    }
    if (i < 50)
        return new RoomPosition(spawn.pos.x + x, spawn.pos.y + y, this.name);
    return undefined;
};
Room.prototype.validBuildingSpot = function (x, y) {
    //console.log('validbuildingspot ' +x + ' '+y)
    if (x < 2 || x > 47 || y < 2 || y > 47)
        return false;
    var pos = new RoomPosition(x, y, this.name);
    var structures = pos.lookFor(LOOK_STRUCTURES);
    var buildingsites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
    var sources = pos.findInRange(FIND_SOURCES, 2);
    var minerals = pos.findInRange(FIND_MINERALS, 2);
    var countStructures = 0;
    for (var i = 0; i < structures.length; i++)
        if (structures[i].structureType != STRUCTURE_ROAD)
            countStructures++;
    if (countStructures > 0)
        return false;
    if (buildingsites.length > 0)
        return false;
    if (sources.length > 0)
        return false;
    if (minerals.length > 0)
        return false;
    if (pos.inRangeTo(this.controller.pos, 2))
        return false;
    for (let nx = -1; nx <= 1; nx++) {
        for (let ny = -1; ny <= 1; ny++) {
            if (Math.abs(nx) + Math.abs(ny) == 2)
                continue; // hoek mag wel grenzen met muur.
            var terrain = this.lookForAt(LOOK_TERRAIN, x + nx, y + ny);
            log('room.validbuildingspot', `looking at ${x + nx}, ${y + ny}`);
            log('room.validbuildingspot', terrain);
            if (terrain[0] == 'wall')
                return false;
        }
    }
    return true;
};
Room.prototype.getSpawn = function () {
    return this.find(FIND_MY_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_SPAWN; } })[0];
};
Room.prototype.initTick = function () {
    //structures initialiseren
    //this.find(FIND_STRUCTURES).forEach(function(structure: Structure){ structure.initTick()});
    //alle dropped energie initialiseren
    this.find(FIND_DROPPED_RESOURCES).forEach(function (dropped) { dropped.reservedEnergy = 0; });
    this.find(FIND_TOMBSTONES).forEach(function (tombstone) { tombstone.reservedEnergy = 0; });
    //indien leeg moving average voor idle workers initialiseren.
    if (this.memory.avgIdleWorkers == undefined) {
        this.memory.avgIdleWorkers = [];
        for (var i = 0; i < 300; i++)
            this.memory.avgIdleWorkers[i] = 0;
    }
    if (this.memory.avgIdleUpgraders == undefined) {
        this.memory.avgIdleUpgraders = [];
        for (var i = 0; i < 300; i++)
            this.memory.avgIdleUpgraders[i] = 0;
    }
    //this.visual.text(roomValue.get(this.name),1,1);
};
Room.prototype.findSources = function () {
    return this.find(FIND_SOURCES);
};
Room.prototype.getLinks = function () {
    return this.find(FIND_MY_STRUCTURES, { filter: (structure) => { return structure.structureType == STRUCTURE_LINK; } });
};
//Find the container where energy can be deposited in a room
Room.prototype.findEnergyDropPoints = function (amount) {
    if (this.storage && this.storage.isActive() && this.storage.store.energy < MIN_STORAGE_ENERGY)
        return [this.storage];
    return this.find(FIND_STRUCTURES, { filter: (structure) => {
            //logger.log('room.findenergydroppoints', JSON.stringify(structure))
            if (!structure.isActive())
                return false;
            if (structure.structureType == STRUCTURE_CONTAINER && structure.pos.findInRange(FIND_SOURCES, 1).length > 0)
                return false;
            let structureTypes = [STRUCTURE_CONTAINER, STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_LINK, STRUCTURE_TOWER, STRUCTURE_TERMINAL];
            let freeCapacity = 0;
            if (structure.store) {
                freeCapacity = structure.storeCapacity - _.sum(structure.store); //- structure.reservedEnergy;
            }
            else if (structure.energy) {
                freeCapacity = structure.energyCapacity - structure.energy; // - structure.reservedEnergy;
            }
            log('room.findenergydroppoints', structureTypes.includes(structure.structureType) && amount < freeCapacity);
            return structureTypes.includes(structure.structureType) && amount < freeCapacity;
        }
    });
};
/*
Room.prototype.findEmptyCreeps = function() {
    var creeps = this.find(FIND_MY_CREEPS, {filter: (creep: Creep) => {return creep.carry.energy == 0 || creep.memory.inQueue==true }});
    return creeps;
}
*/
Room.prototype.checkNukes = function () {
    var nukes = this.find(FIND_NUKES);
    var landingtime = NUKE_LAND_TIME;
    for (var nuke of nukes)
        if (nuke.timeToLand < landingtime)
            landingtime = nuke.timeToLand;
    if (landingtime + 1 < SAFE_MODE_DURATION)
        this.controller.activateSafeMode();
};
Room.prototype.getEnergyCapacityAvailable = function () {
    return this.energyCapacityAvailable;
    //return Math.min (this.energyCapacityAvailable, this.energyAvailable)
};
Room.prototype.run = function () {
    log('room.run', this.name);
    this.initTick();
    var lastErr;
    this.rememberRoom();
    //    if (Game.time % 10 == 0) this.calculateRoomValue();
    // foutmelding triggeren
    if (lastErr)
        throw lastErr;
};
Room.prototype.visualize = function () {
    for (let source of this.find(FIND_SOURCES)) {
        this.visual.text(Math.floor(Memory.transportLoad[source.id]), source.pos);
    }
};

class Atlas {
    constructor() {
        this.roomCache = {};
    }
    getScoutInfo(roomName) {
        if (Memory.rooms[roomName] == undefined)
            Memory.rooms[roomName] = {};
        //if (Memory.rooms[roomName].scoutInfo == undefined) Memory.rooms[roomName] = {}
        this.roomCache[roomName] = Memory.rooms[roomName].scoutInfo;
        return this.roomCache[roomName];
    }
    // return room coordinate numerical value
    getRoomCoordinates(roomName) {
        let resultN = roomName.match('N[0-9]*');
        let resultS = roomName.match('S[0-9]*');
        let resultW = roomName.match('W[0-9]*');
        let resultE = roomName.match('W[0-9]*');
        let x = 0;
        let y = 0;
        if (resultN)
            y = y - Number(resultN.slice(1));
        if (resultS)
            y = y + Number(resultS.slice(1));
        if (resultE)
            x = x - Number(resultE.slice(1));
        if (resultW)
            x = x + Number(resultW.slice(1));
        return { x: x, y: y };
    }
    getRoomCenter(roomName) {
        let roomCenter;
        if (Memory.rooms[roomName])
            roomCenter = Memory.rooms[roomName].center;
        if (roomCenter == undefined) {
            let x_offset = 24;
            let y_offset = 24;
            let x = 0;
            let y = 0;
            let i = 0;
            loop: while (i < 50) {
                for (x = -1 * i; x <= 1 * i; x++) {
                    for (y = -1 * i; y <= 1 * i; y++) {
                        if (Game.map.getTerrainAt(x_offset + x, y_offset + y, roomName) != 'wall')
                            break loop;
                    }
                }
                i++;
            }
            if (Memory.rooms[roomName] == undefined)
                Memory.rooms[roomName] = new Object;
            Memory.rooms[roomName].center = new Object;
            roomCenter = Memory.rooms[roomName].center;
            roomCenter.x = x_offset + x;
            roomCenter.y = y_offset + y;
        }
        try {
            return new RoomPosition(roomCenter.x, roomCenter.y, roomName);
        }
        catch (err) {
            Game.notify('GETCENTER ERROR in ' + roomName + ':' + JSON.stringify(roomCenter));
            throw err;
        }
    }
}

const STAT_PERIOD = 25000; // aantal ticks tussen room statistieken.
const MIN_SPAWN_CPU_BUCKET = [7500, 5000, 2500]; // cpu bucket dat 1e, 2e en 3e spawn uitgaat
class Base {
    constructor(roomBase) {
        this.room = roomBase;
        this.controller = roomBase.controller;
    }
    run(myBases, roomCreeps) {
        log('base.run', 'RUNNING BASE ' + this.room.name);
        let room = this.room;
        if (Game.time % STAT_PERIOD == 0) {
            if (room.memory.energyHistory == undefined)
                room.memory.energyHistory = [];
            let energyHistory = room.memory.energyHistory;
            energyHistory.unshift(room.memory.curEnergyStat);
            if (energyHistory.length > ENERGY_HISTORY_LENGTH)
                energyHistory.pop();
            room.memory.curEnergyStat = 0;
        }
        let lastErr;
        //creeps runnen. in eerste instantie vanuit het midden.
        if (roomCreeps)
            for (let creep of roomCreeps) {
                try {
                    creep.run(); //creep.hasRun = false });
                }
                catch (err) {
                    console.log('error while running creep ' + creep);
                    if (err)
                        console.log(err.stack);
                    lastErr = err;
                }
            }
        //towers runnen
        var towers = this.room.find(FIND_MY_STRUCTURES, { filter: (structure) => { return (structure.structureType == STRUCTURE_TOWER); } });
        for (let tower of towers) {
            try {
                tower.run();
            }
            catch (err) {
                console.log('Error while running tower ' + tower);
                console.log(err.stack);
                lastErr = err;
            }
        }
        // avg idle workers bijwerken en retourneren
        let mainSpawn = this.room.getSpawn();
        let runningAvgIdleWorkers;
        if (mainSpawn)
            runningAvgIdleWorkers = this.room.getSpawn().calculateAvgWorkers(roomCreeps);
        //indien geen spawn, room opgeven
        if (this.controller && this.controller.my && !mainSpawn && this.room.name != Memory.colRoom) {
            console.log('WARNING: NO SPAWN IN ROOM: ' + this.room.name);
            this.controller.unclaim();
        }
        //spawns runnen
        if (this.controller && this.controller.my && Game.cpu.bucket >= MIN_SPAWN_CPU_BUCKET[2]) {
            log('base.run', 'trying spawns');
            var spawns = this.room.find(FIND_MY_SPAWNS, { filter: (o) => { return o.isActive(); } });
            log('base.run', spawns);
            if (spawns.length > 0) {
                let hasRun = false;
                for (let i = 0; i < spawns.length && !hasRun; i++) {
                    if (!spawns[i].spawning && Game.cpu.bucket >= MIN_SPAWN_CPU_BUCKET[2 - i]) {
                        try {
                            log('base.run', 'starting spawn ' + spawns[i].id);
                            spawns[i].run(roomCreeps, runningAvgIdleWorkers);
                            hasRun = true;
                        }
                        catch (err) {
                            console.log('Error while running spawn ' + spawns[i]);
                            console.log(err.stack);
                            lastErr = err;
                        }
                    }
                }
            }
        }
        let links = this.room.getLinks();
        for (let link of links) {
            try {
                link.run();
            }
            catch (err) {
                console.log('Error while running link ' + link);
                console.log(err.stack);
                lastErr = err;
            }
        }
        this.room.autoBuild();
        this.room.checkNukes();
        this.room.visualize();
        let terminal = room.find(FIND_MY_STRUCTURES, { filter: (o) => { return o.structureType == STRUCTURE_TERMINAL; } })[0];
        try {
            if (terminal)
                terminal.run(myBases);
        }
        catch (err) {
            console.log('Error while running terminal ' + terminal);
            console.log(err.stack);
            lastErr = err;
        }
        if (lastErr)
            throw lastErr;
    }
}

//screepsProfiler_2();
//declare var Memory: Memory;
const cpuWindow = 300;
const FULLROOMDIVIDER = 2;
const FLAG_CLEAN_TIME = 10000;
let atlas = new Atlas();
function initGlobal() {
    if (!Memory.transportLoad)
        Memory.transportLoad = {};
    RawMemory.setActiveSegments([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
}
initGlobal();
function myMain() {
    if (!Game.cpu.bucket)
        Game.cpu.bucket = 10000;
    //Memory = JSON.parse(RawMemory.get());
    let rooms = Memory.rooms;
    let startCPU = Game.cpu.getUsed();
    if (!Memory.avgCpuUsed)
        Memory.avgCpuUsed = 0;
    Memory.avgCpuUsed = Memory.avgCpuUsed / cpuWindow * (cpuWindow - 1) + Memory.lastCpuUsed / cpuWindow;
    let cSites = _.size(Game.constructionSites);
    console.log('===== TICK ' + Game.time + ' (AVGCPU: ' + Math.round(Memory.avgCpuUsed / Game.cpu.limit * 1000) / 10 + '% CPUBUCKET: ' + Game.cpu.bucket + ') CSITE: ' + cSites + '  MEMCPU: ' + startCPU + '=====');
    if (Game.time % 1500 == 0 && cSites >= MAX_CONSTRUCTION_SITES)
        removeAllConstructionSites(); // indien te veel onbeheerde construction sites alle verwijderen.
    Game.atlas = atlas;
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            // indien assigned aan room, deleten
            for (let roomName in Memory.rooms)
                if (Memory.rooms[roomName].workerAssignedName == name)
                    delete Memory.rooms[roomName].workerAssignedName;
            delete Memory.creeps[name];
            //console.log('Clearing non-existing creep memory:', name);
        }
    }
    //object met per room een array van creeps
    let roomCreeps = {};
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        let roomName = creep.memory.HomeRoomName;
        if (!roomCreeps[roomName])
            roomCreeps[roomName] = [];
        roomCreeps[roomName].push(creep);
    }
    //rooms doorlopen en runnen
    let lastErr;
    let myBases = [];
    let myLeveledRooms = 0;
    for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            if (room.controller.level > 1)
                myLeveledRooms++;
            myBases.push(new Base(room));
        }
        try {
            Game.rooms[roomName].run();
        }
        catch (err) {
            console.log('Error while running room ' + roomName);
            console.log(err.stack);
            lastErr = err;
        }
    }
    // basissen runnen
    for (let base of myBases) {
        try {
            base.run(myBases, roomCreeps[base.room.name]);
        }
        catch (err) {
            console.log('Error while running base ' + base);
            console.log(err.stack);
            lastErr = err;
        }
    }
    /*
    // terminals runnen
    for (let room of myRooms) {
        let terminal = room.find(FIND_MY_STRUCTURES, {filter: (o:Structure) => {return o.structureType == STRUCTURE_TERMINAL}})[0];
        try {
            if (terminal) terminal.run(myRooms);
        }
        catch(err) {
            console.log ('Error while running terminal ' + terminal );
            console.log (err.stack)
            lastErr = err;
        }
    }*/
    // basissen unclaimen
    if (Game.time % 10000 == 0 && myBases.length == Game.gcl.level)
        unclaimBases(myBases);
    //clean memory (do it after unclaiming bases to remove its source distance)
    if (Game.time % 10000 == 1) {
        cleanMemory(myBases);
        // LAST RESORTif memory is too large, purge it completely
        if (RawMemory.get().length > 2000 * 1024) {
            Memory.rooms = {};
            Game.notify('WARNING: Deleting room memory because memory is full');
        }
    }
    // clean flags
    if (Game.time % 10000 == 1543)
        cleanFlags();
    // nieuwe colonisation target vaststellen
    if (myBases.length < Game.gcl.level)
        colonize(myBases);
    //DEBUG: if (Memory.debugcolonize) colonize(myBases);
    //stats verzamelen energie per basis
    saveEnergyStats();
    if (lastErr)
        throw lastErr;
    Memory.lastCpuUsed = Game.cpu.getUsed();
}
function unclaimBases(myBases) {
    console.log('unclaimbases');
    log('unclaimbases', 'unclaiming bases');
    let fullBases = _.filter(myBases, o => { return o.room.controller && o.room.controller.level == 8; });
    let upgradeBaseCount = _.filter(myBases, o => { return o.room.controller && o.room.controller.level >= 6 && o.room.controller.level < 8; }).length;
    if (fullBases.length / upgradeBaseCount > FULLROOMDIVIDER) {
        log('unclaimbases', 'too many level 8 bases, finding the least productive one to unclaim');
        // controleren of basis al lang genoeg output levert (min 14 dagen)
        fullBases = _.filter(fullBases, o => { return o.room.memory.energyHistory.length >= ENERGY_HISTORY_LENGTH; });
        if (fullBases.length > 0) {
            log('unclaimbases', 'found one or more bases. sorting them for productivity');
            fullBases.sort((a, b) => {
                let aVal = a.room.memory.energyHistory.reduce((as, bs) => as + bs);
                let bVal = b.room.memory.energyHistory.reduce((as, bs) => as + bs);
                if (a < b)
                    return -1;
                if (a > b)
                    return 1;
                return 0;
            });
            console.log('UNCLAIMING BASE ' + fullBases[0].room.name);
            fullBases[0].controller.unclaim();
        }
    }
}
function cleanFlags() {
    for (let flagName in Game.flags) {
        let result = flagName.match('[0-9]*');
        if (result) {
            let placeTime = Number(result);
            if (Game.time - placeTime > FLAG_CLEAN_TIME)
                Game.flags[flagName].remove();
        }
        else {
            Game.flags[flagName].remove();
        }
    }
}
function cleanMemory(myBases) {
    //  clean source distances from rooms
    log('cleanmemory', 'cleaning memory');
    for (let roomName in Memory.rooms) {
        let scoutInfo = Game.atlas.getScoutInfo(roomName);
        if (scoutInfo && scoutInfo.sources) {
            log('cleanmemory', 'checking room ' + roomName);
            for (let sourceID in scoutInfo.sources) {
                log('cleanmemory', 'checking source ' + sourceID);
                let sourceMemory = scoutInfo.sources[sourceID];
                for (let baseRoomName in sourceMemory.roomDistance) {
                    if (_.filter(myBases, o => { return o.room.name == baseRoomName; }).length == 0) {
                        log('cleanmemory', 'cleaning base ' + baseRoomName);
                        delete sourceMemory.roomDistance[baseRoomName];
                    }
                }
            }
        }
    }
}
function saveEnergyStats() {
    let maxProcessTime = 0;
    for (let transaction of Game.market.incomingTransactions) {
        if (transaction.time > maxProcessTime)
            maxProcessTime = transaction.time;
        if (transaction.time <= Memory.lastEnergyStat) {
            Memory.lastEnergyStat = maxProcessTime;
            break;
        }
        let room = Game.rooms[transaction.from];
        if (room && room.controller && room.controller.my && transaction.resourceType == RESOURCE_ENERGY) {
            let roomMemory = room.memory;
            if (!roomMemory.curEnergyStat)
                roomMemory.curEnergyStat = 0;
            roomMemory.curEnergyStat += transaction.amount;
        }
    }
}
function colonize(myBases) {
    log('colonize', 'Checking for colonisation');
    if (Memory.colRoomAge == undefined)
        Memory.colRoomAge = 0;
    if (Memory.colRoom == undefined || Game.time - Memory.colRoomAge > COLONISATION_TARGET_RECYCLE_TIME) {
        let colOffsetRoom = myBases[Math.floor((Math.random() * myBases.length))];
        let maxDistance = Math.ceil(Math.random() * COLONISATION_DIST);
        let targetRoomName = colOffsetRoom.room.name;
        log('colonize', 'Starting colonisation from ' + targetRoomName);
        let distance = -1;
        let scoutInfo = Game.atlas.getScoutInfo(targetRoomName);
        log('colonize', `maxdistance: ${maxDistance}`);
        while (targetRoomName && (distance <= maxDistance
            ||
                !(scoutInfo !== undefined
                    && scoutInfo.hasController
                    && scoutInfo.ownerUserName == undefined
                    && !scoutInfo.hasEnemyCreeps
                    && Game.map.isRoomAvailable(targetRoomName)))) {
            let exits = Game.map.describeExits(targetRoomName);
            var keys = Object.keys(exits);
            let exitKey = keys[Math.floor(keys.length * Math.random())];
            let exitRoomName = exits[exitKey];
            targetRoomName = exitRoomName;
            log('colonize', 'roomname selecation: ' + targetRoomName);
            let result = Game.map.findRoute(colOffsetRoom.room.name, targetRoomName);
            if (result instanceof Array)
                distance = result.length;
            else
                distance = -1;
            log('colonize', exits);
            log('colonize', exitKey);
            log('colonize', exitRoomName);
            log('colonize', distance);
            scoutInfo = Game.atlas.getScoutInfo(targetRoomName);
            if (distance > COLONISATION_DIST)
                targetRoomName = ''; // if not finding anything try again next turn
        }
        let spawnX;
        let spawnY;
        let validSpot;
        if (targetRoomName) {
            do {
                validSpot = true;
                spawnX = _.random(6, 44);
                spawnY = _.random(6, 44);
                for (let nx = -3; nx <= 3; nx++) {
                    for (let ny = -3; ny <= 3; ny++) {
                        var terrain = Game.map.getTerrainAt(spawnX + nx, spawnY + ny, targetRoomName);
                        if (terrain == 'wall')
                            validSpot = false;
                    }
                }
            } while (validSpot == false);
        }
        Memory.colRoom = targetRoomName;
        Memory.colX = spawnX;
        Memory.colY = spawnY;
        if (targetRoomName)
            Memory.colRoomAge = Game.time;
        else
            Memory.colRoomAge = 0;
    }
}
function removeAllConstructionSites() {
    for (let constructionSiteId in Game.constructionSites) {
        let cSite = Game.constructionSites[constructionSiteId];
        if (cSite.progress == 0)
            cSite.remove();
    }
}
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop$1 = ErrorMapper.wrapLoop(() => {
    screepsProfiler_1(function () { myMain(); });
});

exports.loop = myMain;
//# sourceMappingURL=main.js.map
