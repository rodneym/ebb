var util = require('util')
var _globalOpts = {
    debug: false
};
function configure(options) {
    _globalOpts = options;
}
exports.configure = configure;
var Flow = (function () {
    function Flow(steps) {
        this.steps = steps;
        this._name = "Flow";
        this._trace = false;
        this._inspect = false;
        this._fault = false;
        this._automatic = true;
        if(steps === undefined) {
            this.steps = new Array();
        }
    }
    Flow.prototype.execute = function (context) {
        this.context = context;
        process.nextTick(function () {
            this.Step();
        }.bind(this));
    };
    Flow.prototype.setTraceOptions = function (name, inspect, id) {
        this._name = name;
        this._trace = true;
        this._inspect = inspect;
        this._id = id;
    };
    Flow.prototype.stall = function () {
        this.steps.unshift({
            block: function () {
            },
            noop: true,
            name: "noop"
        });
    };
    Flow.prototype.join = function (fn) {
        this.stall();
        return function () {
            try  {
                if(!this._fault) {
                    fn.apply(this.context, arguments);
                    if(this._automatic) {
                        process.nextTick(function () {
                            this.Step();
                        }.bind(this));
                    }
                } else {
                    if(this._trace) {
                        console.log("~~%s~~anon__ - ABORTED!", this._name);
                    }
                }
            } catch (e) {
                this._invokeCatch(e);
            }
        }.bind(this);
    };
    Flow.prototype._insertFlow = function (parent) {
        parent.stall();
        this._parent = parent;
    };
    Flow.prototype.assert = function (value) {
        var tests = {
            isNull: function () {
                if(!((value === undefined) || (value === null))) {
                    throw ({
                        assert: 'isNull',
                        value: value
                    });
                }
                return tests;
            },
            notNull: function () {
                if(value === null) {
                    throw ({
                        assert: "notNull",
                        value: value
                    });
                }
                return tests;
            }
        };
        return tests;
    };
    Flow.prototype.Step = function () {
        var step = this.steps.shift();
        if(step) {
            if(_globalOpts.debug && !step.noop) {
                this._dump(step.name);
            }
            try  {
                step.block.call(this.context, this);
                if(this._automatic && !step.noop) {
                    process.nextTick(function () {
                        this.Step();
                    }.bind(this));
                }
                return;
            } catch (e) {
                this._invokeCatch(e);
            }
        } else {
            this._invokeFinally();
        }
    };
    Flow.prototype._dump = function (stepName) {
        if(this._trace) {
            var id = (this._id) ? util.format("(%s)", this._id) : "";
            console.log("~~%s~~%s~~ %s", this._name, stepName, id);
            if(this._inspect) {
                console.log('context: %s\r\n', util.inspect(this.context));
            }
        }
    };
    Flow.prototype._invokeCatch = function (e) {
        this._fault = true;
        if(this.catch) {
            if(_globalOpts.debug) {
                this._dump('catch');
            }
            this.catch.call(this.context, this, e);
        }
        this._invokeFinally();
    };
    Flow.prototype._invokeFinally = function () {
        if(this.finally) {
            if(_globalOpts.debug) {
                this._dump('finally');
            }
            this.finally.call(this.context, this);
        }
        if(this._parent) {
            this._parent.Step();
        }
    };
    return Flow;
})();
function flow(context, steps) {
    var ebb = new Flow();
    for(var step in steps) {
        if(step == 'catch') {
            ebb.catch = steps[step];
        } else {
            if(step == 'finally') {
                ebb.finally = steps[step];
            } else {
                ebb.steps.push({
                    name: step,
                    block: steps[step],
                    noop: false
                });
            }
        }
    }
    ebb.execute(context);
    return (function () {
        var _methods = {
            trace: function (options) {
                ebb.setTraceOptions(options.name, options.inspect || false, options.id);
                return _methods;
            },
            join: function (parent) {
                ebb._insertFlow(parent);
                return _methods;
            }
        };
        return _methods;
    })();
}
exports.flow = flow;

