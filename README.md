# ebb

ebb lets you unwind JavaScript callback chains in a natural and non-assumptive way.  Unlike other libraries, ebb does not wrap itself around the callback chain and it allows you to use the natural callback signatures of async methods just as they were designed.  The result is more readable, flexible, and maintainable code.  

## Why ebb?

No assumptions - Other flow control libraries rely on callback chaining and assume all of your execution steps are signature compatible. With ebb you have to manually manage the step execution, but you benefit from increased flexibility.  

Contextual Execution - ebb maintains the execution context along the execution path.  This makes it easy to manage and chain complex result structures and coordinate disjoint ebb steps in a simple and consistent manner.

Error Handling - With ebb, you have the option of including 'catch' and 'finally' blocks in your call sequence.  At any point during the flow you can throw an error and cleanly handle it in a familiar way. 

Step Tracing - ebb bakes in step tracing and context inspection to help diagnose and debug complex flow logic.  Tracing can be selectively added to individual flows and enabled/disabled globally.

## A simple ebb flow

```javascript
var message = 'Ebb ';

ebb.flow(null, {
    doThis: function (flow) {
        message += "is a simple ";
    },
    thenThat: function (flow) {
        setTimeout(flow.join(function () {
            message += "way to ";
        }), 250);
    },
    evenNested: function (flow) {
        ebb.flow(this, {
            dangerous: function (flow) {
                process.nextTick(flow.join(function () {
                    throw "code async.";
                }));
            },
            catch: function (flow, e) {
                message += e;
            }
        }).join(flow); // chain to parent flow!
    },
    finally: function (flow) {
        console.log(message);
    }
}).trace({name: 'myFlow', inspect: true});
```

## What about async, step, etc?

There are many other popular control flow packages worth considering - particularly for more advanced usage, and I often use those packages in conjunction with ebb.   Unlike those more complex solutions, ebb is designed specifically for sequenced execution and natural error handling.  You can accomplish both of those things using async, step, or otherwise, but doing them in ebb is just more fun!   


## Install

    npm install ebb

## License
MIT


