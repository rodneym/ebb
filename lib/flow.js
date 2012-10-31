// Copyright 2012 Rodney Muras.  All Rights Reserved.

var util = require('util'),
    uuid = require('node-uuid');
   
var Ebb;

(function() {
    

    var Flow = (function() {
        function Flow()
    })();


    var _trace = function(state, step) {
        if (state.trace) {
            console.log( "~~%s~~%s~~", state.name, step.name );

            if ( state.inspect)
                console.log('context: %s\r\n', util.inspect(state.context));
        }
    };


    var _join = function(_state, cb) {
      
      // push a no-op to stall the stack until cb fires
      _state.stack.unshift( {fn: function() {}, noop: true, name: "noop" }); 

      return function() {
          try {
            // bypass callback during fault
            if (!_state.fault) {
                cb.apply(_state.context, arguments);
                if (_state.automatic)
                    process.nextTick( _state.continue ); // advance the flow
            }
            else if (_state.trace) {
                console.log( "~~%s~~anon__ - ABORTED!", _state.name );
            }
            
          }
          catch(e) {
            _state.throw(e);
          }
      }
    }

    var _throw = function(_state, e) {
        _state.error = e;
        _state.fault = true;

        if (_state.catch) {
            if (_globalOpts.debug)
                _trace(_state, {name: 'catch'});

            _state.catch.call(_state.context, _state, e);
        }
        
        // how is ths getting called after _cathc??????????????
        //_finally(_state);
    }

    var _finally = function(_state) {
        if (_state.finally) {
            if (_globalOpts.debug)
                _trace(_state, {name: 'finally'});

            _state.finally.call(_state.context, _state);
        }
    
        // restart the parent flow
        if (_state.parentFlow)
            _state.parentFlow.continue();
    } 

    var _next = function(_state) {
        var step = _state.stack.shift();  //next step
        if(step) {
            _state.continue = function() { _next(_state); }
            _state.throw = function(e) { _throw(_state, e); }
            _state.join = function(_cb) { return _join(_state, _cb); }

            if (_globalOpts.debug & !step.noop)
                _trace(_state, step);

            try {
                
                // call the current step
                step.fn.call(_state.context, _state); 
 
                // schedule the next step unless we we hooked a callback
                if (_state.automatic & !step.noop)
                    process.nextTick( _state.continue );

                return; //to continue
            }
            catch(e) {
                _throw.call(_state.context, _state, e);
            }
        }
        _finally.call(_state.context, _state);
    }

    module.exports = {
        flow: function(context, steps) {
            //if context is another flow, we chain them
            // inserta noop into our parents stack to stall it our
            // and setup a post finally step in our stack (or func) 
            // to call our parents continue when we are done

            var _state = {
                stack: Array()
              , steps: steps
              , automatic: true
              , name: 'flow'
              , trace: false
              , inspect: false
              , context: context
              , traceId: uuid.v1()
              , catch: undefined
              , finally: undefined
              , join: undefined                     
              , parentFlow: null
            };
            
            for( var step in steps) 
                if (step == 'catch') 
                    _state.catch = steps[step];
                else if (step == 'finally') 
                    _state.finally = steps[step];
                else 
                    _state.stack.push({fn: steps[step], name: step});

            //start the flow on next tick to alloc chained trace optoins to run!            
            process.nextTick( function(){_next(_state);});

            return (function(){
                var _methods = {                    
                    trace: function(options) {
                        _state.trace = true;
                        _state.name = options.name;
                        _state.inspect = options.inspect;
                        return _methods; 
                    }.bind(this)
                  , join: function(parentFlow) {
                        _state.parentFlow = parentFLow;
                        parentFlow.stack.unshift( {fn: function() {}, noop: true, name: "noop" }); 
                        return _methods;
                    }.bind(this)
                }

                return _methods;
            }).bind(this)();
        }

        // module level options
      , configure: function(options) {
                _globalOpts = options;
            }.bind(this)
    }
   
})(Ebb || (Ebb = {}));
            

