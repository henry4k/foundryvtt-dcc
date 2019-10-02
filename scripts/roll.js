import { registerTemplate, validateForm } from './utils.js'
import { diceChain } from './config.js'

const diceChainIndex = (function() {
    const index = {}
    diceChain.forEach((dice, i) => {
        index[dice] = i
    })
    return index
})()

const rollDialogTemplate = registerTemplate('roll-dialog')
registerTemplate('inline-roll')
registerTemplate('dice-selection')


const diceExpressionPattern = /(\d*)d(\d+)/

export class DccRoll extends Roll {
    static parseCommand(message) {
        // Dice roll regex
        const formula = '([^#]*)'+ // Capture any string not starting with '#'
                        '(?:(?:#\\s?)(.*))?' // Capture any remaining flavor text
        const roll = '^(\\/r(?:oll)? )' // Regular rolls, support /r or /roll
        const gm = '^(\\/gmr(?:oll)? )' // GM rolls, support /gmr or /gmroll
        const br = '^(\\/b(?:lind)? )'; // Blind rolls, support /br or /blindroll

        // Define regex patterns
        const patterns = {
            'roll': new RegExp(roll+formula, 'i'),
            'gmroll': new RegExp(gm+formula, 'i'),
            'blindroll': new RegExp(br+formula, 'i')
        }

        // Iterate over patterns, finding the first match
        let command, pattern, match;
        for([command, pattern] of Object.entries(patterns)) {
            match = message.match(pattern)
            if(match)
                return [command, match]
        }
        return [null, null]
    }

    static getDieWithOffset(die, chainOffset) {
        let index = diceChainIndex[die.toString()]
        if(index === undefined)
            throw new Error('Initial dice is not present in chain.')
        index += chainOffset
        if(index < 0 || index >= diceChain.length)
            throw new Error('Targeted dice is not present in chain.')
        return diceChain[index]
    }

    static parseDiceExpression(expression) {
        const groups = diceExpressionPattern.exec(expression)
        if(groups === null)
            return null
        return {
            count: groups[1] !== '' ? Number.parseInt(groups[1]) : 1,
            value: Number.parseInt(groups[2])
        }
    }

    /**
     * @param {Event} event           The triggering event which initiated the roll
     * @param {Array} parts           The dice roll component parts, excluding the initial d20
     * @param {Actor} actor           The Actor making the d20 roll
     * @param {Object} data           Actor or item data against which to parse the roll
     * @param {String} template       The HTML template used to render the roll dialog
     * @param {String} title          The dice roll UI window title
     * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
     * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
     * @param {Boolean} advantage     Allow rolling with advantage (and therefore also with disadvantage)
     * @param {Boolean} situational   Allow for an arbitrary situational bonus field
     * @param {Boolean} fastForward   Allow fast-forward advantage selection
     * @param {Number} critical       The value of d20 result which represents a critical success
     * @param {Number} fumble         The value of d20 result which represents a critical failure
     * @param {Function} onClose      Callback for actions to take when the dialog form is closed
     * @param {Object} dialogOptions  Modal dialog options
     */
    static async createDccRollMessage({event,
                                       diceCount=1,
                                       diceSides=20,
                                       diceChainModifier=0,
                                       parts,
                                       partData,
                                       speaker,
                                       flavor}) {
        diceSides = this.getDiceWithOffset(diceSides, diceChainModifier)

        let dialogData = {
            diceCount: diceCount,
            diceSides: diceSides,
            rollMode: game.settings.get('core', 'rollMode'),
            rollModes: CONFIG.rollModes,
            flavor: flavor
        }

        const skipDialog = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey

        if(!skipDialog) {
            const dialogHtml = await renderTemplate(rollDialogTemplate, dialogData)
            await new Promise(function(resolve, _reject) {
                new Dialog({
                    title: 'uhh...',
                    content: dialogHtml,
                    buttons: {
                        confirm: {
                            label: game.i18n.localize('DCC.letsRoll')
                        }
                    },
                    default: 'confirm',
                    close: function(html) {
                        const form = html[0].querySelector('form')
                        const formData = validateForm(form)
                        mergeObject(dialogData, formData)
                        resolve()
                    }
                }).render(true)
            })
        }

        const diceExpression = `${dialogData.diceCount}d${dialogData.diceSides}`
        parts = [diceExpression].concat(parts)
        const formula = parts.join('+')
        const roll = new this(formula, partData)
        return roll.toMessage({
            speaker: speaker,
            flavor: dialogData.flavor,
            rollMode: dialogData.rollMode
        })
    }

    async getInlineRollData() {
        // Add the roll
        if(!this._rolled)
            this.roll()
        return {
            total: this.total,
            tooltip: await this.getTooltip(),
            parts: this.parts.map(part => {
                if(part instanceof Die) {
                    const die = part
                    const minRoll = Math.min(...die.sides)
                    const maxRoll = Math.max(...die.sides)
                    return {
                        isDie: true,
                        formula: die.formula,
                        total: die.total,
                        rolls: die.rolls.map(roll => {
                            return {
                                result: die._getTooltip(roll.roll),
                                sides: die.faces,
                                classes: [
                                    'd'+die.faces,
                                    roll.rerolled ? 'rerolled' : null,
                                    roll.exploded ? 'exploded' : null,
                                    roll.discarded ? 'discarded': null,
                                    (roll.roll === minRoll) ? 'min' : null,
                                    (roll.roll === maxRoll) ? 'max' : null
                                ].filter(c => c).join(' ')
                            }
                        })
                    }
                } else {
                    return {
                        isDie: false,
                        formula: part
                    }
                }
            })
        }
    }

    async render(chatOptions) {
        chatOptions = mergeObject({
            user: game.user._id,
            flavor: null,
            template: CONFIG.Roll.template
        }, chatOptions || {})

        // Execute the roll, if needed
        if(!this._rolled)
            this.roll()

        // Construct chat data
        const chatData = {
            user: chatOptions.user,
            total: this.total,
            flavor: chatOptions.flavor
        }

        chatData.parts = this.parts.map(part => {
            if(part instanceof Die) {
                const die = part
                const minRoll = Math.min(...die.sides)
                const maxRoll = Math.max(...die.sides)
                return {
                    isDie: true,
                    formula: die.formula,
                    total: die.total,
                    rolls: die.rolls.map(roll => {
                        return {
                            result: die._getTooltip(roll.roll),
                            sides: die.faces,
                            classes: [
                                'd'+die.faces,
                                roll.rerolled ? 'rerolled' : null,
                                roll.exploded ? 'exploded' : null,
                                roll.discarded ? 'discarded': null,
                                (roll.roll === minRoll) ? 'min' : null,
                                (roll.roll === maxRoll) ? 'max' : null
                            ].filter(c => c).join(' ')
                        }
                    })
                }
            } else {
                return {
                    isDie: false,
                    formula: part
                }
            }
        })

        // Render the requested chat template
        return renderTemplate(chatOptions.template, chatData);
    }

    async toMessage(chatData) {
        chatData = mergeObject({
            user: game.user._id,
            rollMode: game.settings.get('core', 'rollMode'),
            sound: CONFIG.sounds.dice
        }, chatData || {})

        // Add the roll
        if(!this._rolled)
            this.roll()
        //chatData.roll = this; // ChatMessage only handles Roll instances this way

        // Handle type
        if(['gmroll', 'blindroll'].includes(chatData.rollMode)) {
            chatData.whisper = game.users.entities.filter(u => u.isGM).map(u => u._id)
            if(chatData.rollMode === 'blindroll') {
                chatData.blind = true
                AudioHelper.play({src: chatData.sound})
            }
        }

        // Render (custom) template
        chatData.content = await this.render({user: chatData.user})

        // Create the message
        return ChatMessage.create(chatData)
    }
}
CONFIG.Roll.template = registerTemplate('dice-roll')

Hooks.on('chatMessage', (chatLog, message, chatData) => {
    const [command, match] = DccRoll.parseCommand(message)
    if(!match)
        return true

    let roll
    try {
        const [formula, flavor] = match.slice(2, 4)
        roll = new DccRoll(formula, DccRoll.getActorData()).roll()
        chatData.flavor = flavor
    } catch(err) {
        throw new Error(`Unable to parse the roll expression: ${formula}.`)
    }

    //delete chatData.roll // ChatMessage only handles Roll instances this way

    roll.toMessage(chatData)

    return false
})

export const createRollMessage = async function({
        event,
        dialogTemplate,
        dialogData,
        dialogOptions,
        messageTemplate,
        getMessageData}) {
    const skipDialog = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey
    if(!skipDialog) {
        const dialogHtml = await renderTemplate(dialogTemplate, dialogData)
        await new Promise(function(resolve, _reject) {
            const defaultDialogOptions = {
                classes: Dialog.defaultOptions.classes.concat(['dcc']),
                content: dialogHtml,
                close: function(html) {
                    const form = html[0].querySelector('form')
                    const formData = validateForm(form)
                    mergeObject(dialogData, formData)
                    resolve()
                }
            }
            const mergedDialogOptions = mergeObject(
                dialogOptions,
                defaultDialogOptions,
                {overwrite: false, inplace: false})
            new Dialog(mergedDialogOptions).render(true)
        })
    }

    const messageData = await getMessageData(dialogData)

    messageData.user = game.user._id

    const rollMode = game.settings.get('core', 'rollMode')
    if(['gmroll', 'blindroll'].includes(rollMode)) {
        messageData.whisper = game.users.entities.filter(u => u.isGM).map(u => u._id)
        messageData.blind = rollMode === 'blindroll'
    }

    messageData.content = await renderTemplate(messageTemplate, messageData)

    return ChatMessage.create(messageData)
}
