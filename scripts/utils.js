export const getAbilityModifier = (score) => Math.floor((score - 10) / 2)
export const systemRoot = 'public/systems/dcc'


// ---- TEMPLATES ----

let templates = new Set()

const getTemplatePath = name => `${systemRoot}/templates/${name}.handlebars`

export const registerTemplate = function(name) {
    const path = getTemplatePath(name)
    if(templates) {
        templates.add(path)
        return path
    } else {
        throw new Error('Templates must be registered before the init event is fired.')
    }
}

// Pre-load templates:
Hooks.once('init', function() {
    loadTemplates(Array.from(templates.values()))
    templates = null
})


// ...

export const activateButtons = function(rootElement, target) {
    rootElement.querySelectorAll('button').forEach(button =>
        button.addEventListener('click', event => {
            event.preventDefault();
            const button = event.currentTarget
            const buttonName = button.getAttribute('name')
            if(!buttonName)
                return
            const methodName = `_on${buttonName.capitalize()}ButtonPress`
            target[methodName](event)
    }))
}


// ---- HTML ----

/*
export const html = {
    hasClass: function(el, className) {
        return el.classList ? el.classList.contains(className) : new RegExp('\\b'+ className+'\\b').test(el.className);
    },
    addClass: function(el, className) {
        if (el.classList) el.classList.add(className);
        else if (!KHelpers.hasClass(el, className)) el.className += ' ' + className;
    },
    removeClass: function(el, className) {
        if (el.classList) el.classList.remove(className);
        else el.className = el.className.replace(new RegExp('\\b'+ className+'\\b', 'g'), '');
    },
    offset: function(el) {
        var rect = el.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
    },
    style: function(el) {
        return el.currentStyle || window.getComputedStyle(el);
    },
    insertAfter: function(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
    },
    insertBefore: function(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode);
    }
}
*/


// ---- TEMPORARY FIXES ----

// until the original version supports radio buttions
export const validateForm = function(formElement) {
    const form = new FormData(formElement)
    const formData = {}

    // Always include Boolean checkboxes
    for(let box of formElement.querySelectorAll('input[type="checkbox"]')) {
        if(box.disabled)
            continue
        formData[box.name] = Boolean(box.checked) || false
    }

    // Grab images which are editable
    for(let img of formElement.querySelectorAll('img[data-edit]')) {
        if(img.getAttribute('disabled'))
            continue
        formData[img.dataset.edit] = img.src.replace(window.location.origin+'/', '')
    }

    // Grab divs which are editable
    for(let div of formElement.querySelectorAll('div[data-edit]')) {
        if(div.getAttribute('disabled'))
            continue
        formData[div.dataset.edit] = div.innerHTML.trim()
    }

    // Iterate over form elements, validating and converting type
    form.forEach((v, k)=> {
        const input = formElement[k]

        // Skip checkboxes which have already been handled
        if(input.type === 'checkbox')
            return

        // Skip fields which are set as disabled
        if(input.disabled)
            return

        // Cast the input to a specific dtype
        let dtype;
        if(input instanceof NodeList) {
            for(let i = 0; i < input.length; i++) {
                if(input[i].hasAttribute('data-dtype')) {
                    dtype = input[i].getAttribute('data-dtype')
                    break
                }
            }
        } else {
            dtype = input.dataset.dtype
        }
        if(!dtype)
            dtype = 'String'

        if((dtype !== 'String') && (v !== '')) {
            formData[k] = window[dtype] instanceof Function ? window[dtype](v) : v
        } else {
            formData[k] = v
        }
    })
    return formData
}
