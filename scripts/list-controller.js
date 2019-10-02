const passthrough = v => v

export class ListController {
    constructor({propertyPath, uniqueValues=true, parseValue}) {
        this.propertyPath = propertyPath
        this.uniqueValues = uniqueValues
        this.parseValue = parseValue || passthrough
    }

    _getList(sheet) {
        return getProperty(sheet.entity.data, this.propertyPath)
    }

    _setList(sheet, values) {
        sheet.entity.update({
            [this.propertyPath]: values
        })
    }

    _removeListValue(_event, sheet, value) {
        const oldList = this._getList(sheet) || []
        let newList;
        if(this.uniqueValues) {
            newList = oldList.filter(v => v !== value)
        } else {
            const index = oldList.indexOf(value)
            if(index === -1)
                return
            newList = oldList.slice(0, index).concat(oldList.slice(index+1))
        }
        this._setList(sheet, newList)
    }

    _removeListValueByIndex(_event, sheet, index) {
        const oldList = this._getList(sheet) || []
        const newList = oldList.slice(0, index).concat(oldList.slice(index+1))
        this._setList(sheet, newList)
    }

    _addListValue(_event, sheet, value) {
        if(!value || value === '')
            return
        const oldList = this._getList(sheet) || []
        if(this.uniqueValues && oldList.includes(value))
            return
        const newList = oldList.concat([value])
        this._setList(sheet, newList)
    }

    onActivateListeners(sheet, html) {
        html = html[0] // substitude jQuery-Object for the real HTMLElement
        html.querySelectorAll('[data-list="'+this.propertyPath+'"]').forEach(element => {
            const action = element.getAttribute('data-list-action')

            const hasListValue = element.hasAttribute('data-list-value')
            const hasListIndex = element.hasAttribute('data-list-index')

            const getValue = () => {
                return this.parseValue(hasListValue ?
                                       element.getAttribute('data-list-value') :
                                       element.value)
            }

            let actionFn;
            if(action === 'remove') {
                if(hasListIndex) {
                    actionFn = event => {
                        const index = Number.parseInt(element.getAttribute('data-list-index'))
                        this._removeListValueByIndex(event, sheet, index)
                    }
                } else {
                    actionFn = event => {
                        this._removeListValue(event, sheet, getValue())
                    }
                }
            } else if(action === 'add') {
                actionFn = event => {
                    this._addListValue(event, sheet, getValue())
                }
            }

            const useElementValue = !hasListValue && !hasListIndex

            if(useElementValue)
                element.value = '' // so any selection will cause a change event

            const eventName = useElementValue ? 'change' : 'click'
            element.addEventListener(eventName, event => {
                event.preventDefault()
                event.stopPropagation()
                actionFn(event)
            })
        })
    }
}
