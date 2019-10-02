import { getAbilityModifier, registerTemplate, activateButtons } from './utils.js'
import { ListController } from './list-controller.js'

const sheetTemplate = registerTemplate('actor-sheet')

export class DccActorSheet extends ActorSheet {
    static get defaultOptions() {
        const options = super.defaultOptions
        options.classes = options.classes.concat(['dcc', 'actor-sheet'])
        options.template = sheetTemplate
        //options.width = 600
        options.height = 800
        return options
    }

    getData() {
        const sheetData = super.getData()
        const actorData = sheetData.actor

        const abilities = actorData.data.abilities
        for(let ability of Object.values(abilities)) {
            ability.modifier = getAbilityModifier(ability.value)
        }

        const saves = actorData.data.saves
        for(let save of Object.values(saves)) {
            save.value = Math.max(0,
                abilities[save.ability].modifier +
                save.modifier)
        }

        for(let item of actorData.items) {
            const type = item.type
            item['is'+type.capitalize()] = true

            const description = item.data.description.value
            if(description !== '')
                item.description = description
        }

        let armorClassBonus = 0
        let armorCheckPenalty = 0
        let armorSpeedPenalty = 0
        let armorFumbleDie = 0
        for(let item of actorData.items) {
            if(item.type === 'armor') {
                const itemData = item.data
                armorClassBonus   += itemData.armorClassBonus.value
                armorCheckPenalty += itemData.checkPenalty.value
                armorSpeedPenalty += itemData.speedPenalty.value
                const fumbleDie = itemData.fumbleDie.value
                if(fumbleDie > armorFumbleDie) {
                    armorFumbleDie = fumbleDie
                }
            }
        }

        const attributes = actorData.data.attributes

        attributes.initiative.value = Math.max(0,
            abilities.agility.modifier +
            attributes.initiative.modifier)
        // Warriors add their class!

        attributes.speed.value = Math.max(0,
            attributes.speed.base -
            armorSpeedPenalty)

        attributes.armorClass.value = Math.max(0,
            abilities.agility.modifier +
            attributes.armorClass.base +
            attributes.armorClass.modifier +
            armorClassBonus)

        //const itemsByType = {}
        //for(let item of actorData.items) {
        //    const type = item.type
        //    let container = itemsByType[type]
        //    if(!container) {
        //        container = []
        //        itemsByType[type] = container
        //    }
        //    container.push(item)
        //}
        //sheetData.itemsByType = itemsByType

        return sheetData
    }

    activateListeners(html) {
        super.activateListeners(html)

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable)
            return

        new ListController({
            propertyPath: 'data.attributes.actionDice.value',
            uniqueValues: false,
            parseValue: Number.parseInt
        }).onActivateListeners(this, html)

        html = html[0] // substitude jQuery-Object for the real HTMLElement

        // Item Dragging
        const handler = event => this._onDragItemStart(event)
        html.querySelectorAll('.item').forEach(itemElement => {
            itemElement.setAttribute('draggable', true)
            itemElement.addEventListener('dragstart', handler, false);
        })

        activateButtons(html, this)
    }

    _getItemByElement(element) {
        const itemElement = element.closest('.item')
        const itemId = Number(itemElement.getAttribute('data-item-id'))
        return this.actor.getOwnedItem(itemId)
    }

    _onEditItemButtonPress(event) {
        const item = this._getItemByElement(event.currentTarget)
        item.sheet.render(true)
    }

    _onDeleteItemButtonPress(event) {
        const button = event.currentTarget
        const itemElement = button.closest('.item')
        const itemId = Number(itemElement.getAttribute('data-item-id'))
        this.actor.deleteOwnedItem(itemId)
        itemElement.slideUp(200, () => this.render(false))
    }

    _onAttackButtonPress(event) {
        const item = this._getItemByElement(event.currentTarget)
        item.attackRoll(event)
    }
}
Actors.unregisterSheet('core', ActorSheet)
Actors.registerSheet('dcc', DccActorSheet, {makeDefault: true})
