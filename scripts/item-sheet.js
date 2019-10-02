import { registerTemplate } from './utils.js'
import { ListController } from './list-controller.js'

const detailsTemplates = {}
const itemTypes = ['armor', 'weapon'];
itemTypes.forEach(name => {
    detailsTemplates[name] = registerTemplate(name+'-details')
})
const sheetTemplate = registerTemplate('item-sheet')


export class DccItemSheet extends ItemSheet {
    static get defaultOptions() {
        const options = super.defaultOptions
        options.classes = options.classes.concat(['dcc', 'item-sheet'])
        options.template = sheetTemplate
        options.height = 400
        return options
    }

    getData() {
        const itemData = super.getData()

        // Sheet display details
        const type = this.item.type;
        mergeObject(itemData, {
            type: type,
            hasDetails: itemTypes.includes(type),
            detailsTemplate: () => detailsTemplates[type]
        })

        return itemData
    }

    activateListeners(html) {
        super.activateListeners(html)

        // Activate tabs
        new Tabs(html.find('.tabs'), {
          initial: this.item.data.flags['_sheetTab'],
          callback: clicked => this.item.data.flags['_sheetTab'] = clicked.attr('data-tab')
        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable)
            return

        // Checkbox changes
        html.find('input[type="checkbox"]').change(event => this._onSubmit(event));

        new ListController({
            propertyPath: 'data.traits.value'
        }).onActivateListeners(this, html)

        new ListController({
            propertyPath: 'data.traits.custom'
        }).onActivateListeners(this, html)
    }
}
Items.unregisterSheet('core', ItemSheet)
Items.registerSheet('dcc', DccItemSheet, {makeDefault: true})
