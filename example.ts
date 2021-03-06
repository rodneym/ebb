// Copyright 2012 Rodney Muras.  All Rights Reserved.

///<reference path='node.d.ts'/>
import ebb = module('./lib/ebb');

ebb.configure( {debug: true});

var message = 'Ebb ';

ebb.flow(null, {
    doThis: function(flow) {	
        message += "is a simple ";
    },

    thenThat: function(flow) {
        setTimeout( flow.join(function() {
            message += "way to ";
        }), 250);
    },

    evenNested: function(flow) {
        ebb.flow(this, {
            dangerous: function(flow) {
                process.nextTick(flow.join(function() {
                    throw "code async.";
                }));
            },

            catch: function(flow, e) {
                message += e;
            }
        }).join(flow); // <- chain to the parent flow
    },

    finally: function(flow) {
        console.log(message);
    } 
}).trace({name: 'myFlow', inspect: true});


