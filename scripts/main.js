import { systemRoot, getAbilityModifier } from './utils.js'
import './roll.js'
import './actor-sheet.js'
import './item-sheet.js'
import './item.js'
import './config.js'

Handlebars.registerHelper('concat', function(...args) {
    return args.slice(0, -1).join('')
})

Handlebars.registerHelper('assetPath', function(path) {
    return systemRoot+'/'+path
})

Handlebars.registerHelper('configValue', function(key) {
    return CONFIG[key]
})

Handlebars.registerHelper('listHas', function(list, value) {
    return list.includes(value)
})

//class DccActor extends Actor {
//    prepareData(actorData) {
//        actorData = super.prepareData(actorData)
//        const data = actorData.data
//
//
//        return actorData
//    }
//}
//CONFIG.Actor.entityClass = DccActor

Hooks.once('init', function () {
    Combat.prototype._getInitiativeFormula = function(combatant) {
        const actor = combatant.actor;

        let initiative = 0

        if (actor) {
            const data = actor.data.data
            initiative = Math.max(0,
                getAbilityModifier(data.abilities.agility.value) +
                data.attributes.initiative.modifier)
        }

        return '1d20+'+initiative
    }
})
