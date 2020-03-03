// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

import CodeMirror from "codemirror/lib/codemirror";
import "codemirror/mode/markdown/markdown";
import "codemirror/addon/mode/overlay";
  
CodeMirror.defineMode("brillink", function(config, modeConfig) {
  function startState() {
    return { immediate: null, brackets: false }
  }

  function token(stream, state) {
    switch (state.immediate) {
      case 'linkcoming':
        state.immediate = 'linkcoming-B';
        stream.eatSpace();
        return null;
      case 'linkcoming-B':
        state.immediate = null;
        return stream.match(/[a-zA-Z_][a-zA-Z0-9_-]*/)
          ? 'sectiontag'
          : null;
      case 'bracketed':
        state.immediate = 'bracketed-B';
        stream.eatSpace();
        return null;
      case 'bracketed-B':
        state.immediate = null;
        if (stream.match(/[A-Z][a-zA-Z0-9_\-]*/)) {
          return 'markup-tag';
        }
    }

    if (state.brackets) {
      if (stream.eatSpace()) {
        return null;
      }
      if (stream.match(/[a-z][A-Za-z0-9_-]* *:/)) {
        return "markup-label";
      }
      if (stream.eat('=')) {
        return "markup-keyword";
      }
      if (stream.eat(/[1-9][0-9]*/)) {
        return "literal-arg";
      }
      if (stream.eat('"')) {
        let ch;
        while ((ch = stream.next()) != '"') {
          if (stream.eat('\\')) {
            if (stream.eol()) {
              return 'error';
            }
            stream.next();
          }
          if (stream.eol()) {
            return 'error';
          }
        }
        return 'literal-string';
      }
      if (stream.match("true")) {
        return 'literal-arg';
      }
      if (stream.match("false")) {
        return 'literal-arg';
      }
      if (stream.match("->")) {
        if (state.brackets > 0) {
          state.immediate = 'linkcoming';
          return "arrow";
        }
        return null;
      }
    }

    if (stream.sol()) {
      if (stream.match(/###/)) {
        stream.eatSpace();
        if (!stream.eol()) {
          state.immediate = 'linkcoming-B';
        }
        return "header header-3";
      }
      if (stream.match(/#/)) {
        stream.skipToEnd();
        return "header header-1";
      }
    }

    const ch = stream.next();
    if (ch === '[') {
      if (state.brackets) {
        return "error";
      }
      state.brackets = true;
      state.immediate = 'bracketed';
      return "markup-bracket";
    }
    if (ch === ']') {
      if (!state.brackets) {
        return "error";
      }
      state.brackets = false;
      return "markup-bracket";
    }
    return null;
  }
  return { startState, token };
});
