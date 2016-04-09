var moment = require('moment')

module.exports = {
    start: function(msg, done){
        // test semantic analysis
        var bosonnlp = require('bosonnlp');
        var nlp = new bosonnlp.BosonNLP('LYLJJvt9.5912.g1zeLUmF91s1');

        // fsm
        var StateMachine = require('javascript-state-machine')
        var fsm = StateMachine.create({
        	initial: 'nil',
        	events: [{
        		name: 'searchAction',
        		from: 'nil',
        		to: 'knowingAction'
        	}, {
        		name: 'searchTime',
        		from: 'knowingAction',
        		to: 'knowingTime'
        	}, {
                name: 'searchLocation',
        		from: 'knowingTime',
        		to: 'knowingLocation'
        	}, {
                name: 'sendRequest',
        		from: 'knowingLocation',
        		to: 'sendingRequest'
        	}, {
        		name: 'fail',
        		from: ['knowingAction', 'knowingTime', 'knowingLocation', 'sendingRequest'],
        		to: 'exit'
        	}],
        	callbacks: {
        		onknowingAction: function(event, from, to, msg){
        			// FIXME
        			nlp.ner(msg, function(resData) {
        				var result = (JSON.parse(resData)[0]),
                            entity = result.entity
        					tags = result.tag,
        					words = result.word

        				tags.forEach(function(tag, i) {
        					if (tag === 'v') {
        						var identification = identifyAction(words[i])
        						if(identification && fsm.current === 'knowingAction'){
        							fsm.searchTime({
                                        entity,
        								tags,
        								words,
        								action: identification
        							})
        						}
        					}
        				})
        			})
        		},
        		onknowingTime: function(event, from, to, msg){
        			var timeStr = '',
                        d = null
        			msg.tags.forEach(function(tag, i) {
        				if (tag === 't') {
        					timeStr += msg.words[i]
                            d = identifyTime(d, msg.words[i])
        				}
        			})
        			if(timeStr){
        				fsm.searchLocation({
                            entity: msg.entity,
                            words: msg.words,
        					action: msg.action,
        					time: {
                                from: d.from,
                                to: d.to
                            }
        				})
        			}
        		},
                onknowingLocation: function(event, from, to, msg){
                    var entities = msg.entity,
                        location = ''

                    entities.forEach(function(entity){
                        if(entity[2] === 'location'){
                            location
                            console.log(msg.words.slice(entity[0], entity[1]));
                        }
                    })
                    fsm.sendRequest({
                        action: msg.action,
                        time: msg.time
                    })
                },
        		onsendingRequest: function(event, from, to, msg){
        			done(msg)
        		}
        	}
        })

        fsm.searchAction(msg)

        // 查询关键字
        function identifyAction(word) {
        	var targets = {
        		check: ['查看', '查询', '查'],
        		reserve: ['预定', '预订', '订'],
        	}
        	for(var i in targets){
        		if(targets.hasOwnProperty(i)){
        			var target = targets[i]

        			if(target.indexOf(word) > -1){
        				return i
        			}
        		}
        	}
        }

        function identifyTime(d, word) {
        	if(!d){
                d = {
                    from: moment().minute(0).second(0),
                    to: moment().minutes(0).seconds(0)
                }
            }
            switch (word) {
                case '上午':
                    d.from.hour(8)
                    d.to.hour(12)
                    break;
                case '下午':
                    d.from.hour(12)
                    d.to.hour(17)
                    break;
                case '晚上':
                    d.from.hour(17)
                    d.to.hour(21)
                    break;
                case '明天':
                    d.from.date(moment().add(1, 'days').date())
                    d.to.date(moment().add(1, 'days').date())
                    break;
                case '后天':
                    d.from.date(moment().add(2, 'days').date())
                    d.to.date(moment().add(2, 'days').date())
                    break;
                default:
            }
            return d
        }
    }
}
