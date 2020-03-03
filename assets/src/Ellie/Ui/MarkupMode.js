// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

import CodeMirror from 'codemirror/lib/codemirror';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/addon/mode/overlay';

/**
* The key idea for syntax highlighting the brillink syntax
* is that after a line beginning with ! or ?, every subsequent line that is 
* *further* indented is config, until:
*  1) another ! or ? appears, resetting to that new tag with that new indent
*  2) a -> appears, resetting to regular markup.
*/
CodeMirror.defineMode('brillink', function(config, modeConfig) {
  function startState() {
    return {
      commentDepth: 0,
      mode: null, // null, "line", "inline", "markup-line", or "markup-inline"
      identation: 0,
      immediately: null,
    };
  }

  function eatMarkupToken(stream, state) {
    if (stream.match(/\|> *[a-z][a-zA-Z0-9_]* */)) {
      return 'markup-label';
    } else if (stream.match(/[0-9]+ */)) {
      return 'literal-arg';
    } else if (stream.match(/[a-z][a-zA-Z0-9_-]* */)) {
      return 'variable-arg';
    } else if (stream.match(/"[a-zA-Z0-9()/\\ _,.!?'-]*" */)) {
      return 'literal-string';
    } else if (stream.match(/-> */)) {
      if (stream.mode === 'inline') {
        return 'error';
      } else if (stream.eol()) {
        state.mode = null;
      } else {
        state.immediately = 'arrowed';
      }
      return 'arrow';
    } else if (!stream.eol()) {
      stream.skipToEnd();
      return 'error';
    }    
  }

  function eatMarkdownToken(stream, state) {
    if (stream.match(/\[\[ */)) {
      console.log(stream.peek())
      if (stream.match(/ *[a-z][a-zA-Z0-9_]* */)) {
        state.mode = 'inline';
        return 'markup-tag';
      } else {
        return 'error';
      }
    }
    stream.next();
    return null;
  }

  function token(stream, state) {
    if (state.commentDepth > 0) {
      if (stream.match('-}')) {
        state.commentDepth -= 1;
      } else if (stream.match('{-')) {
        state.commentDepth += 1;
      } else {
        stream.next();
      }
      return 'markup-comment';
    }

    if (stream.match(/ *{-/)) {
      state.commentDepth = 1;
      return 'markup-comment';
    }

    if (state.mode === 'inline') {
      stream.eatSpace();
      if (stream.match(/]]/)) {
        state.mode = null;
        return 'markup-tag';
      }
      return eatMarkupToken(stream, state);
    }

    let ch;
    if (stream.sol()) {
      stream.eatSpace();
      const indentation = stream.indentation();
      if (stream.eat('#')) {
        if (indentation > 0) {
          stream.skipToEnd();
          return 'error';
        }
        if (stream.match(/## */)) {
          if (stream.eol()) {
            state.mode = 'line';
            state.identation = 0;
          } else if (stream.peek() === '|') {
            state.mode = 'line';
            state.identation = 0;
          } else {
            state.immediately = 'getStitchName';
          }
          return 'header';
        } else {
          stream.skipToEnd();
          state.indentation = 0;
          state.mode = 'line';
          return 'header';          
        }
      }
      if (ch = stream.eat(/[!?]/)) {
        if (stream.match(/ *[a-z][a-zA-Z0-9_]* */)) {
          state.mode = 'line';
          state.indentation = indentation;
          return ch === '!' ? 'markup-tag' : 'markup-option-tag';
        } else {
          return 'error';
        }
      }
      if (state.mode === 'line') {
        if (indentation <= state.indentation) {
          state.mode = null;
          state.indentation = 0;
          return eatMarkdownToken(stream, state);
        } else {
          return eatMarkupToken(stream, state);  
        }
      } else {
        return eatMarkdownToken(stream, state);
      }
      
    } else if (state.immediately !== null) {
      const mode = state.immediately;
      state.immediately = null;
      switch (mode) {
        case 'getStitchName':
          if (stream.match(/[a-z][a-zA-Z0-9_-]* */)) {
            state.mode = null;
            state.indentation = 0;
            return 'sectiontag';
          } else {
            stream.skipToEnd();
            return 'error';
          }
        case 'arrowed':
          if (stream.match(/[a-z][a-zA-Z0-9_-]* */)) {
            return 'sectiontag';
          } else {
            stream.skipToEnd();
            return 'error';
          }
      }
    } else if (state.mode === 'line') {
      return eatMarkupToken(stream, state);
    } else {
      return eatMarkdownToken(stream, state);
    }
  }
  
  return { startState, token };
});
