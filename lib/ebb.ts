// Copyright 2012 Rodney Muras.  All Rights Reserved.

///<reference path='node.d.ts'/>
import util = module('util');

interface globalOpts {
    debug: bool;
}

var _globalOpts = {
    debug: false
};

export function configure(options: globalOpts) {
    _globalOpts = options;
}

interface Step {
    name: string; 
    block: (context: any)=>any;
    noop : bool;
}

interface FlowOptions {
    name: string;
    inspect?: bool;
    id?: string;
}

class Flow {
    context: any;
    _name = "Flow";
    _trace = false;
    _inspect = false;
    _id: string;
    _parent: Flow;
    _fault = false;
    _automatic = true;

    // error callbacks
    catch: (flow: Flow, e:any) => any;
    finally: (flow: Flow) => any;

    constructor( public steps?: Step [] ) {
        if (steps === undefined) { this.steps = new Step []; }
    }

    execute(context: any) {
        this.context = context;
        process.nextTick(function() { this.Step(); }.bind(this));
    }

    setTraceOptions( name: string, inspect: bool, id?: string) {
        this._name = name;
        this._trace = true;
        this._inspect = inspect;
        this._id = id;
    }

    stall() {
        this.steps.unshift( {block: function() {}, noop: true, name: "noop" }); 
    }

    join(fn: () => any) {
        // push a no-op to stall the stack until cb fires
        this.stall();

        return function() {
            try {
                // bypass callback during fault
                if (!this._fault) {
                    fn.apply(this.context, arguments);
                    if (this._automatic)
                        process.nextTick(function() { this.Step(); }.bind(this));
                }
                else if (this._trace) {
                    console.log( "~~%s~~anon__ - ABORTED!", this._name );
                }                                 
            }
            catch(e) {
                this._invokeCatch(e);
            }
        }.bind(this);
    }

    
    _insertFlow(parent: Flow) {
        parent.stall();
        this._parent = parent;
    }


    assert(value) {
        var tests = {
            isNull: function() {
                if (! ((value === undefined) || (value === null)))
                    throw( {assert: 'isNull', value: value});

                return tests;
            },
            notNull: function() {
                if (value === null)
                    throw( {assert: "notNull", value: value});

                return tests;
            }
        }

        return tests;
    }


    Step() {
        var step = this.steps.shift();  
              
        if(step) {
            if (_globalOpts.debug && !step.noop)
                this._dump(step.name);
            try {
                step.block.call(this.context, this); 

                // schedule the next step unless we we hooked a callback
                if (this._automatic && !step.noop)
                    process.nextTick(function() {this.Step();}.bind(this));
                    
                return; //to continue
            }
            catch(e) {
                this._invokeCatch(e);
            }
        }
        else {
            this._invokeFinally();
        }
    }

    _dump(stepName: string) {
        if (this._trace) {
            var id = (this._id) ? util.format("(%s)", this._id) : "";
            console.log( "~~%s~~%s~~ %s", this._name, stepName, id );

            if (this._inspect)
                console.log('context: %s\r\n', util.inspect(this.context));
        }
    }

    _invokeCatch(e) {
        this._fault = true;

        if (this.catch) {
            if (_globalOpts.debug)
                this._dump('catch');

            this.catch.call(this.context, this, e);
        }                     

        this._invokeFinally();
    }

    _invokeFinally() {
        if (this.finally) { 
            if (_globalOpts.debug)
                this._dump('finally');
            
            this.finally.call(this.context, this);
        }

        if (this._parent)
            this._parent.Step();
   }
}	

export function flow( context, steps ) {

    var ebb = new Flow();

    for( var step in steps) 
        if (step == 'catch') 
            ebb.catch = steps[step];
        else if (step == 'finally') 
            ebb.finally = steps[step];
        else 
            ebb.steps.push({name:step, block:steps[step], noop: false});

    ebb.execute(context);
            

    // start the flow
    return (function(){
        var _methods = {
            trace: function(options: FlowOptions) {
                ebb.setTraceOptions(options.name, options.inspect || false, options.id);
                return _methods; 
            },
            join: function(parent: Flow) {
                ebb._insertFlow(parent);
                return _methods;
            }
        }
        return _methods;
    })();
}




