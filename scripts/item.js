import { DccRoll, createRollMessage } from './roll.js'
import { registerTemplate, getAbilityModifier } from './utils.js'


const attackDialogTemplate  = registerTemplate('attack-dialog')
const attackMessageTemplate = registerTemplate('attack-message')

const sumModifiers = modifiers => Object.values(modifiers).reduce((a,b) => a+b)

export class DccItem extends Item {
    // attack roll:
    // Action Die
    // + Attack Bonus (based on class and level)
    // + Strength Modifier (if melee attack)
    // + Agility Modifier (if ranged attack)
    // + Other effects (abilities, spells, ...)
    // + Situational Modifiers (Range, Cover, Untrained, ...)
    //
    // roll == highest side: automatic hit
    // roll within crit range: roll on crit table if hit successful

    // damage roll:
    // Weapon Damage Dice
    // + Strength Modifier (if melee attack)

    // crit roll:
    // Crit Dice (defined by class and level)
    // + Luck Modifier
    // Crit Table (defined by class and level)

    getAttackRollData(attackType) {
        const itemData = this.data
        const actorData = this.actor.data

        const itemTraits = itemData.data.traits.value

        const isUntrainedWeapon = itemTraits.includes('untrained')
        const isMeleeWeapon  = itemTraits.includes('melee')
        const isRangedWeapon = itemTraits.includes('ranged')
        const attackBonus = actorData.data.attributes.attackBonus.value
        const strengthModifier = getAbilityModifier(actorData.data.abilities.strength.value)
        const agilityModifier = getAbilityModifier(actorData.data.abilities.agility.value)

        if(!attackType) {
            if(isMeleeWeapon && !isRangedWeapon)
                attackType = 'melee'
            else if(isRangedWeapon && !isMeleeWeapon)
                attackType = 'ranged'
        }

        const attackDice = actorData.data.attributes.actionDice.value

        const attackDieModifiers = {}
        if(isUntrainedWeapon)
            attackDieModifiers.untrained = -1

        const attackModifiers = {}
        if(attackBonus !== 0)
            attackModifiers.attackBonus = attackBonus
        if(attackType === 'melee' && strengthModifier !== 0)
            attackModifiers.strength = strengthModifier
        else if(attackType === 'ranged' && agilityModifier !== 0)
            attackModifiers.agility = agilityModifier

        const damageDiceSets = [itemData.data.damageDice,
                                itemData.data.alternateDamageDice]

        const damageModifiers = {}
        if(attackType === 'melee' && strengthModifier !== 0)
            damageModifiers.strength = strengthModifier

        return {
            attack: {
                type: attackType,
                availableDice: attackDice,
                die: attackDice[0] || 0,
                dieModifiers: attackDieModifiers,
                modifiers: attackModifiers,
            },
            damage: {
                availableDiceSets: damageDiceSets,
                dice: damageDiceSets[0],
                modifiers: damageModifiers
            }
        }
    }

    async attackRoll(event) {
        const itemData = this.data
        const actorData = this.actor.data
        const attackType = null // TODO

        createRollMessage({
            event: event,
            dialogTemplate: attackDialogTemplate,
            dialogData: this.getAttackRollData(attackType),
            dialogOptions: {
                title: 'Angriffsdialog!',
                buttons: {
                    confirm: {
                        label: game.i18n.localize('DCC.letsRoll')
                    }
                },
                default: 'confirm',
            },
            messageTemplate: attackMessageTemplate,
            getMessageData: async d => {
                const attackDieModifier = sumModifiers(d.attack.dieModifiers)
                const attackModifier = sumModifiers(d.attack.modifiers)
                const damageModifier = sumModifiers(d.damage.modifiers)

                const attackDie = DccRoll.getDieWithOffset(d.attack.die, attackDieModifier)
                const attackFormula = `1d${attackDie}+${attackModifier}`

                const damageDice = DccRoll.parseDiceExpression(d.damage.diceExpr)
                const damageFormula = `${damageDice.count}d${damageDice.value}+${damageModifier}`

                const [attackRoll, damageRoll] = await Promise.all([
                    new DccRoll(attackFormula).getInlineRollData(),
                    new DccRoll(damageFormula).getInlineRollData()])
                d.attack.roll = attackRoll
                d.damage.roll = damageRoll

                return {
                    flavor: 'Hier kommt Fluff hin.',
                    actor: actorData,
                    item: itemData,
                    attack: d.attack,
                    damage: d.damage
                }
            }
        })

        //DccRoll.createDccRollMessage({
        //    event: event,
        //    diceSides: 20,
        //    diceChainModifier: 0,
        //    parts: ['@ability'],
        //    partData: {
        //        ability: getAbilityModifier(actorData.data.abilities.strength.value)
        //    },
        //    flavor: 'Angriff!1elf'
        //})
    }

    async _onDamageButtonPress(event) {
        const itemData = this.data
        const actorData = this.actor.data

        //const isMeleeWeapon = itemData.data.isMeleeWeapon.value
        //const isRangedWeapon = itemData.data.isMeleeWeapon.value
        const ability = itemData.data.damageAbility.value
        let abilityModifier = 0
        if(ability !== '')
            abilityModifier = getAbilityModifier(actorData.data.abilities[ability].value)

        DccRoll.createDccRollMessage({
            event: event,
            diceCount: itemData.data.damageDie.count,
            diceSides: itemData.data.damageDie.value,
            diceChainModifier: 0,
            parts: ['@ability'],
            partData: {
                ability: abilityModifier
            },
            flavor: 'Schaden!1elf'
        })
    }
}
CONFIG.Item.entityClass = DccItem
