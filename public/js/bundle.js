
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function (exports) {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /* src\components\test.svelte generated by Svelte v3.38.2 */

    const file$4 = "src\\components\\test.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "helloooooooooooooooooooooo";
    			t1 = space();
    			p = element("p");
    			t2 = text(/*test*/ ctx[0]);
    			t3 = space();
    			img = element("img");
    			this.c = noop;
    			add_location(h1, file$4, 7, 2, 93);
    			add_location(p, file$4, 8, 2, 132);
    			if (img.src !== (img_src_value = "../resources/img/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$4, 9, 2, 149);
    			add_location(div, file$4, 6, 0, 84);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			append_dev(div, img);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*test*/ 1) set_data_dev(t2, /*test*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("what-ever", slots, []);
    	let { test = 0 } = $$props;
    	const writable_props = ["test"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<what-ever> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("test" in $$props) $$invalidate(0, test = $$props.test);
    	};

    	$$self.$capture_state = () => ({ test });

    	$$self.$inject_state = $$props => {
    		if ("test" in $$props) $$invalidate(0, test = $$props.test);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [test];
    }

    class Test extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>div h1{color:red}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{ test: 0 }
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["test"];
    	}

    	get test() {
    		return this.$$.ctx[0];
    	}

    	set test(test) {
    		this.$set({ test });
    		flush();
    	}
    }

    customElements.define("what-ever", Test);

    /* src\components\material.svelte generated by Svelte v3.38.2 */

    const file$3 = "src\\components\\material.svelte";

    function create_fragment$4(ctx) {
    	let h3;
    	let t1;
    	let child_ui;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "aaaaa";
    			t1 = space();
    			child_ui = element("child-ui");
    			this.c = noop;
    			add_location(h3, file$3, 2, 0, 40);
    			add_location(child_ui, file$3, 3, 0, 56);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, child_ui, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(child_ui);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("material-ui", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<material-ui> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Material extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>h3{color:blue}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{}
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("material-ui", Material);

    /* eslint-disable no-param-reassign */

    /**
     * Options for customizing ripples
     */
    const defaults = {
      color: 'currentColor',
      class: '',
      opacity: 0.1,
      centered: false,
      spreadingDuration: '.4s',
      spreadingDelay: '0s',
      spreadingTimingFunction: 'linear',
      clearingDuration: '1s',
      clearingDelay: '0s',
      clearingTimingFunction: 'ease-in-out',
    };

    /**
     * Creates a ripple element but does not destroy it (use RippleStop for that)
     *
     * @param {Event} e
     * @param {*} options
     * @returns Ripple element
     */
    function RippleStart(e, options = {}) {
      e.stopImmediatePropagation();
      const opts = { ...defaults, ...options };

      const isTouchEvent = e.touches ? !!e.touches[0] : false;
      // Parent element
      const target = isTouchEvent ? e.touches[0].currentTarget : e.currentTarget;

      // Create ripple
      const ripple = document.createElement('div');
      const rippleStyle = ripple.style;

      // Adding default stuff
      ripple.className = `material-ripple ${opts.class}`;
      rippleStyle.position = 'absolute';
      rippleStyle.color = 'inherit';
      rippleStyle.borderRadius = '50%';
      rippleStyle.pointerEvents = 'none';
      rippleStyle.width = '100px';
      rippleStyle.height = '100px';
      rippleStyle.marginTop = '-50px';
      rippleStyle.marginLeft = '-50px';
      target.appendChild(ripple);
      rippleStyle.opacity = opts.opacity;
      rippleStyle.transition = `transform ${opts.spreadingDuration} ${opts.spreadingTimingFunction} ${opts.spreadingDelay},opacity ${opts.clearingDuration} ${opts.clearingTimingFunction} ${opts.clearingDelay}`;
      rippleStyle.transform = 'scale(0) translate(0,0)';
      rippleStyle.background = opts.color;

      // Positioning ripple
      const targetRect = target.getBoundingClientRect();
      if (opts.centered) {
        rippleStyle.top = `${targetRect.height / 2}px`;
        rippleStyle.left = `${targetRect.width / 2}px`;
      } else {
        const distY = isTouchEvent ? e.touches[0].clientY : e.clientY;
        const distX = isTouchEvent ? e.touches[0].clientX : e.clientX;
        rippleStyle.top = `${distY - targetRect.top}px`;
        rippleStyle.left = `${distX - targetRect.left}px`;
      }

      // Enlarge ripple
      rippleStyle.transform = `scale(${
    Math.max(targetRect.width, targetRect.height) * 0.02
  }) translate(0,0)`;
      return ripple;
    }

    /**
     * Destroys the ripple, slowly fading it out.
     *
     * @param {Element} ripple
     */
    function RippleStop(ripple) {
      if (ripple) {
        ripple.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'opacity') ripple.remove();
        });
        ripple.style.opacity = 0;
      }
    }

    /**
     * @param node {Element}
     */
    var Ripple = (node, _options = {}) => {
      let options = _options;
      let destroyed = false;
      let ripple;
      let keyboardActive = false;
      const handleStart = (e) => {
        ripple = RippleStart(e, options);
      };
      const handleStop = () => RippleStop(ripple);
      const handleKeyboardStart = (e) => {
        if (!keyboardActive && (e.keyCode === 13 || e.keyCode === 32)) {
          ripple = RippleStart(e, { ...options, centered: true });
          keyboardActive = true;
        }
      };
      const handleKeyboardStop = () => {
        keyboardActive = false;
        handleStop();
      };

      function setup() {
        node.classList.add('s-ripple-container');
        node.addEventListener('pointerdown', handleStart);
        node.addEventListener('pointerup', handleStop);
        node.addEventListener('pointerleave', handleStop);
        node.addEventListener('keydown', handleKeyboardStart);
        node.addEventListener('keyup', handleKeyboardStop);
        destroyed = false;
      }

      function destroy() {
        node.classList.remove('s-ripple-container');
        node.removeEventListener('pointerdown', handleStart);
        node.removeEventListener('pointerup', handleStop);
        node.removeEventListener('pointerleave', handleStop);
        node.removeEventListener('keydown', handleKeyboardStart);
        node.removeEventListener('keyup', handleKeyboardStop);
        destroyed = true;
      }

      if (options) setup();

      return {
        update(newOptions) {
          options = newOptions;
          if (options && destroyed) setup();
          else if (!(options || destroyed)) destroy();
        },
        destroy,
      };
    };

    /* node_modules\svelte-materialify\dist\components\MaterialApp\MaterialApp.svelte generated by Svelte v3.38.2 */

    const file$2 = "node_modules\\svelte-materialify\\dist\\components\\MaterialApp\\MaterialApp.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let slot;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			slot = element("slot");
    			this.c = noop;
    			add_location(slot, file$2, 13089, 2, 248677);
    			attr_dev(div, "class", div_class_value = "s-app theme--" + /*theme*/ ctx[0]);
    			add_location(div, file$2, 13088, 0, 248639);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, slot);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*theme*/ 1 && div_class_value !== (div_class_value = "s-app theme--" + /*theme*/ ctx[0])) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("null", slots, []);
    	let { theme = "light" } = $$props;
    	const writable_props = ["theme"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<null> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    	};

    	$$self.$capture_state = () => ({ theme });

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [theme];
    }

    class MaterialApp extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>@charset "UTF-8";:global(.theme--light){--theme-surface:#fff;--theme-text-primary:rgba(0,0,0,0.87);--theme-text-secondary:rgba(0,0,0,0.6);--theme-text-disabled:rgba(0,0,0,0.38);--theme-text-link:#1976d2;--theme-icons-active:rgba(0,0,0,0.54);--theme-icons-inactive:rgba(0,0,0,0.38);--theme-inputs-box:rgba(0,0,0,0.04);--theme-buttons-disabled:rgba(0,0,0,0.26);--theme-tabs:rgba(0,0,0,0.54);--theme-text-fields-filled:rgba(0,0,0,0.06);--theme-text-fields-filled-hover:rgba(0,0,0,0.12);--theme-text-fields-outlined:rgba(0,0,0,0.38);--theme-text-fields-outlined-disabled:rgba(0,0,0,0.26);--theme-text-fields-border:rgba(0,0,0,0.42);--theme-controls-disabled:rgba(0,0,0,0.26);--theme-controls-thumb-inactive:#fff;--theme-controls-thumb-disabled:#fafafa;--theme-controls-track-inactive:rgba(0,0,0,0.38);--theme-controls-track-disabled:rgba(0,0,0,0.12);--theme-tables-active:#f5f5f5;--theme-tables-hover:#eee;--theme-tables-group:#eee;--theme-datatables-row-hover:rgba(0,0,0,0.04);--theme-dividers:rgba(0,0,0,0.12);--theme-chips:#e0e0e0;--theme-cards:#fff;--theme-app-bar:#f5f5f5;--theme-navigation-drawer:#fff;background-color:var(--theme-surface);color:var(--theme-text-primary)}:global(.theme--light) :global(a){color:#1976d2}:global(.theme--light) :global(.text--primary){color:var(--theme-text-primary)}:global(.theme--light) :global(.text--secondary){color:var(--theme-text-secondary)}:global(.theme--light) :global(.text--disabled){color:var(--theme-text-disabled)}:global(.theme--dark){--theme-surface:#212121;--theme-icons-active:#fff;--theme-icons-inactive:hsla(0,0%,100%,0.5);--theme-text-primary:#fff;--theme-text-secondary:hsla(0,0%,100%,0.7);--theme-text-disabled:hsla(0,0%,100%,0.5);--theme-text-link:#82b1ff;--theme-inputs-box:#fff;--theme-buttons-disabled:hsla(0,0%,100%,0.3);--theme-tabs:hsla(0,0%,100%,0.6);--theme-text-fields-filled:hsla(0,0%,100%,0.08);--theme-text-fields-filled-hover:hsla(0,0%,100%,0.16);--theme-text-fields-outlined:hsla(0,0%,100%,0.24);--theme-text-fields-outlined-disabled:hsla(0,0%,100%,0.16);--theme-text-fields-border:hsla(0,0%,100%,0.7);--theme-controls-disabled:hsla(0,0%,100%,0.3);--theme-controls-thumb-inactive:#bdbdbd;--theme-controls-thumb-disabled:#424242;--theme-controls-track-inactive:hsla(0,0%,100%,0.3);--theme-controls-track-disabled:hsla(0,0%,100%,0.1);--theme-tables-active:#505050;--theme-tables-hover:#616161;--theme-tables-group:#616161;--theme-datatables-row-hover:hsla(0,0%,100%,0.04);--theme-dividers:hsla(0,0%,100%,0.12);--theme-chips:#555;--theme-cards:#1e1e1e;--theme-app-bar:#272727;--theme-navigation-drawer:#363636;background-color:var(--theme-surface);color:var(--theme-text-primary)}:global(.theme--dark) :global(a){color:#82b1ff}:global(.theme--dark) :global(.text--primary){color:var(--theme-text-primary)}:global(.theme--dark) :global(.text--secondary){color:var(--theme-text-secondary)}:global(.theme--dark) :global(.text--disabled){color:var(--theme-text-disabled)}:global(:root){--theme-bp-xs:0;--theme-bp-sm:600px;--theme-bp-md:960px;--theme-bp-lg:1264px;--theme-bp-xl:1904px}:global(html){box-sizing:border-box;-webkit-text-size-adjust:100%;word-break:normal;-moz-tab-size:4;tab-size:4}:global(*),:global(:after),:global(:before){background-repeat:no-repeat;box-sizing:inherit}:global(:after),:global(:before){text-decoration:inherit;vertical-align:inherit}:global(*){padding:0;margin:0}:global(hr){overflow:visible;height:0}:global(details),:global(main){display:block}:global(summary){display:list-item}:global(small){font-size:80%}:global([hidden]){display:none}:global(abbr[title]){border-bottom:none;text-decoration:underline;text-decoration:underline dotted}:global(a){background-color:transparent}:global(a:active),:global(a:hover){outline-width:0}:global(code),:global(kbd),:global(pre),:global(samp){font-family:monospace, monospace}:global(pre){font-size:1em}:global(b),:global(strong){font-weight:bolder}:global(sub),:global(sup){font-size:75%;line-height:0;position:relative;vertical-align:baseline}:global(sub){bottom:-0.25em}:global(sup){top:-0.5em}:global(input){border-radius:0}:global([disabled]){cursor:default}:global([type=number]::-webkit-inner-spin-button),:global([type=number]::-webkit-outer-spin-button){height:auto}:global([type=search]){-webkit-appearance:textfield;outline-offset:-2px}:global([type=search]::-webkit-search-decoration){-webkit-appearance:none}:global(textarea){overflow:auto;resize:vertical}:global(button),:global(input),:global(optgroup),:global(select),:global(textarea){font:inherit}:global(optgroup){font-weight:700}:global(button){overflow:visible}:global(button),:global(select){text-transform:none}:global([role=button]),:global([type=button]),:global([type=reset]),:global([type=submit]),:global(button){cursor:pointer;color:inherit}:global([type=button]::-moz-focus-inner),:global([type=reset]::-moz-focus-inner),:global([type=submit]::-moz-focus-inner),:global(button::-moz-focus-inner){border-style:none;padding:0}:global([type=button]::-moz-focus-inner),:global([type=reset]::-moz-focus-inner),:global([type=submit]::-moz-focus-inner),:global(button:-moz-focusring){outline:1px dotted ButtonText}:global([type=reset]),:global([type=submit]),:global(button),:global(html) :global([type=button]){-webkit-appearance:button}:global(button),:global(input),:global(select),:global(textarea){background-color:transparent;border-style:none}:global(select){-moz-appearance:none;-webkit-appearance:none}:global(select::-ms-expand){display:none}:global(select::-ms-value){color:currentColor}:global(legend){border:0;color:inherit;display:table;white-space:normal;max-width:100%}:global(::-webkit-file-upload-button){-webkit-appearance:button;color:inherit;font:inherit}:global(img){border-style:none}:global(progress){vertical-align:baseline}:global(svg:not([fill])){fill:currentColor}@media screen{:global([hidden~=screen]){display:inherit}:global([hidden~=screen]:not(:active):not(:focus):not(:target)){position:absolute !important;clip:rect(0 0 0 0) !important}}:global([aria-busy=true]){cursor:progress}:global([aria-controls]){cursor:pointer}:global([aria-disabled=true]){cursor:default}:global(.elevation-0){box-shadow:0 0 0 0 rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(0, 0, 0, 0.14), 0 0 0 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-1){box-shadow:0 2px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 1px 3px 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-2){box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-3){box-shadow:0 3px 3px -2px rgba(0, 0, 0, 0.2), 0 3px 4px 0 rgba(0, 0, 0, 0.14), 0 1px 8px 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-4){box-shadow:0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-5){box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 5px 8px 0 rgba(0, 0, 0, 0.14), 0 1px 14px 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-6){box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12) !important}:global(.elevation-7){box-shadow:0 4px 5px -2px rgba(0, 0, 0, 0.2), 0 7px 10px 1px rgba(0, 0, 0, 0.14), 0 2px 16px 1px rgba(0, 0, 0, 0.12) !important}:global(.elevation-8){box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12) !important}:global(.elevation-9){box-shadow:0 5px 6px -3px rgba(0, 0, 0, 0.2), 0 9px 12px 1px rgba(0, 0, 0, 0.14), 0 3px 16px 2px rgba(0, 0, 0, 0.12) !important}:global(.elevation-10){box-shadow:0 6px 6px -3px rgba(0, 0, 0, 0.2), 0 10px 14px 1px rgba(0, 0, 0, 0.14), 0 4px 18px 3px rgba(0, 0, 0, 0.12) !important}:global(.elevation-11){box-shadow:0 6px 7px -4px rgba(0, 0, 0, 0.2), 0 11px 15px 1px rgba(0, 0, 0, 0.14), 0 4px 20px 3px rgba(0, 0, 0, 0.12) !important}:global(.elevation-12){box-shadow:0 7px 8px -4px rgba(0, 0, 0, 0.2), 0 12px 17px 2px rgba(0, 0, 0, 0.14), 0 5px 22px 4px rgba(0, 0, 0, 0.12) !important}:global(.elevation-13){box-shadow:0 7px 8px -4px rgba(0, 0, 0, 0.2), 0 13px 19px 2px rgba(0, 0, 0, 0.14), 0 5px 24px 4px rgba(0, 0, 0, 0.12) !important}:global(.elevation-14){box-shadow:0 7px 9px -4px rgba(0, 0, 0, 0.2), 0 14px 21px 2px rgba(0, 0, 0, 0.14), 0 5px 26px 4px rgba(0, 0, 0, 0.12) !important}:global(.elevation-15){box-shadow:0 8px 9px -5px rgba(0, 0, 0, 0.2), 0 15px 22px 2px rgba(0, 0, 0, 0.14), 0 6px 28px 5px rgba(0, 0, 0, 0.12) !important}:global(.elevation-16){box-shadow:0 8px 10px -5px rgba(0, 0, 0, 0.2), 0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12) !important}:global(.elevation-17){box-shadow:0 8px 11px -5px rgba(0, 0, 0, 0.2), 0 17px 26px 2px rgba(0, 0, 0, 0.14), 0 6px 32px 5px rgba(0, 0, 0, 0.12) !important}:global(.elevation-18){box-shadow:0 9px 11px -5px rgba(0, 0, 0, 0.2), 0 18px 28px 2px rgba(0, 0, 0, 0.14), 0 7px 34px 6px rgba(0, 0, 0, 0.12) !important}:global(.elevation-19){box-shadow:0 9px 12px -6px rgba(0, 0, 0, 0.2), 0 19px 29px 2px rgba(0, 0, 0, 0.14), 0 7px 36px 6px rgba(0, 0, 0, 0.12) !important}:global(.elevation-20){box-shadow:0 10px 13px -6px rgba(0, 0, 0, 0.2), 0 20px 31px 3px rgba(0, 0, 0, 0.14), 0 8px 38px 7px rgba(0, 0, 0, 0.12) !important}:global(.elevation-21){box-shadow:0 10px 13px -6px rgba(0, 0, 0, 0.2), 0 21px 33px 3px rgba(0, 0, 0, 0.14), 0 8px 40px 7px rgba(0, 0, 0, 0.12) !important}:global(.elevation-22){box-shadow:0 10px 14px -6px rgba(0, 0, 0, 0.2), 0 22px 35px 3px rgba(0, 0, 0, 0.14), 0 8px 42px 7px rgba(0, 0, 0, 0.12) !important}:global(.elevation-23){box-shadow:0 11px 14px -7px rgba(0, 0, 0, 0.2), 0 23px 36px 3px rgba(0, 0, 0, 0.14), 0 9px 44px 8px rgba(0, 0, 0, 0.12) !important}:global(.elevation-24){box-shadow:0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14), 0 9px 46px 8px rgba(0, 0, 0, 0.12) !important}:global(.red){background-color:#f44336 !important;border-color:#f44336 !important}:global(.red-text){color:#f44336 !important;caret-color:#f44336 !important}:global(.red.base){background-color:#f44336 !important;border-color:#f44336 !important}:global(.red-text.text-base){color:#f44336 !important;caret-color:#f44336 !important}:global(.red.lighten-5){background-color:#ffebee !important;border-color:#ffebee !important}:global(.red-text.text-lighten-5){color:#ffebee !important;caret-color:#ffebee !important}:global(.red.lighten-4){background-color:#ffcdd2 !important;border-color:#ffcdd2 !important}:global(.red-text.text-lighten-4){color:#ffcdd2 !important;caret-color:#ffcdd2 !important}:global(.red.lighten-3){background-color:#ef9a9a !important;border-color:#ef9a9a !important}:global(.red-text.text-lighten-3){color:#ef9a9a !important;caret-color:#ef9a9a !important}:global(.red.lighten-2){background-color:#e57373 !important;border-color:#e57373 !important}:global(.red-text.text-lighten-2){color:#e57373 !important;caret-color:#e57373 !important}:global(.red.lighten-1){background-color:#ef5350 !important;border-color:#ef5350 !important}:global(.red-text.text-lighten-1){color:#ef5350 !important;caret-color:#ef5350 !important}:global(.red.darken-1){background-color:#e53935 !important;border-color:#e53935 !important}:global(.red-text.text-darken-1){color:#e53935 !important;caret-color:#e53935 !important}:global(.red.darken-2){background-color:#d32f2f !important;border-color:#d32f2f !important}:global(.red-text.text-darken-2){color:#d32f2f !important;caret-color:#d32f2f !important}:global(.red.darken-3){background-color:#c62828 !important;border-color:#c62828 !important}:global(.red-text.text-darken-3){color:#c62828 !important;caret-color:#c62828 !important}:global(.red.darken-4){background-color:#b71c1c !important;border-color:#b71c1c !important}:global(.red-text.text-darken-4){color:#b71c1c !important;caret-color:#b71c1c !important}:global(.red.accent-1){background-color:#ff8a80 !important;border-color:#ff8a80 !important}:global(.red-text.text-accent-1){color:#ff8a80 !important;caret-color:#ff8a80 !important}:global(.red.accent-2){background-color:#ff5252 !important;border-color:#ff5252 !important}:global(.red-text.text-accent-2){color:#ff5252 !important;caret-color:#ff5252 !important}:global(.red.accent-3){background-color:#ff1744 !important;border-color:#ff1744 !important}:global(.red-text.text-accent-3){color:#ff1744 !important;caret-color:#ff1744 !important}:global(.red.accent-4){background-color:#d50000 !important;border-color:#d50000 !important}:global(.red-text.text-accent-4){color:#d50000 !important;caret-color:#d50000 !important}:global(.pink){background-color:#e91e63 !important;border-color:#e91e63 !important}:global(.pink-text){color:#e91e63 !important;caret-color:#e91e63 !important}:global(.pink.base){background-color:#e91e63 !important;border-color:#e91e63 !important}:global(.pink-text.text-base){color:#e91e63 !important;caret-color:#e91e63 !important}:global(.pink.lighten-5){background-color:#fce4ec !important;border-color:#fce4ec !important}:global(.pink-text.text-lighten-5){color:#fce4ec !important;caret-color:#fce4ec !important}:global(.pink.lighten-4){background-color:#f8bbd0 !important;border-color:#f8bbd0 !important}:global(.pink-text.text-lighten-4){color:#f8bbd0 !important;caret-color:#f8bbd0 !important}:global(.pink.lighten-3){background-color:#f48fb1 !important;border-color:#f48fb1 !important}:global(.pink-text.text-lighten-3){color:#f48fb1 !important;caret-color:#f48fb1 !important}:global(.pink.lighten-2){background-color:#f06292 !important;border-color:#f06292 !important}:global(.pink-text.text-lighten-2){color:#f06292 !important;caret-color:#f06292 !important}:global(.pink.lighten-1){background-color:#ec407a !important;border-color:#ec407a !important}:global(.pink-text.text-lighten-1){color:#ec407a !important;caret-color:#ec407a !important}:global(.pink.darken-1){background-color:#d81b60 !important;border-color:#d81b60 !important}:global(.pink-text.text-darken-1){color:#d81b60 !important;caret-color:#d81b60 !important}:global(.pink.darken-2){background-color:#c2185b !important;border-color:#c2185b !important}:global(.pink-text.text-darken-2){color:#c2185b !important;caret-color:#c2185b !important}:global(.pink.darken-3){background-color:#ad1457 !important;border-color:#ad1457 !important}:global(.pink-text.text-darken-3){color:#ad1457 !important;caret-color:#ad1457 !important}:global(.pink.darken-4){background-color:#880e4f !important;border-color:#880e4f !important}:global(.pink-text.text-darken-4){color:#880e4f !important;caret-color:#880e4f !important}:global(.pink.accent-1){background-color:#ff80ab !important;border-color:#ff80ab !important}:global(.pink-text.text-accent-1){color:#ff80ab !important;caret-color:#ff80ab !important}:global(.pink.accent-2){background-color:#ff4081 !important;border-color:#ff4081 !important}:global(.pink-text.text-accent-2){color:#ff4081 !important;caret-color:#ff4081 !important}:global(.pink.accent-3){background-color:#f50057 !important;border-color:#f50057 !important}:global(.pink-text.text-accent-3){color:#f50057 !important;caret-color:#f50057 !important}:global(.pink.accent-4){background-color:#c51162 !important;border-color:#c51162 !important}:global(.pink-text.text-accent-4){color:#c51162 !important;caret-color:#c51162 !important}:global(.purple){background-color:#9c27b0 !important;border-color:#9c27b0 !important}:global(.purple-text){color:#9c27b0 !important;caret-color:#9c27b0 !important}:global(.purple.base){background-color:#9c27b0 !important;border-color:#9c27b0 !important}:global(.purple-text.text-base){color:#9c27b0 !important;caret-color:#9c27b0 !important}:global(.purple.lighten-5){background-color:#f3e5f5 !important;border-color:#f3e5f5 !important}:global(.purple-text.text-lighten-5){color:#f3e5f5 !important;caret-color:#f3e5f5 !important}:global(.purple.lighten-4){background-color:#e1bee7 !important;border-color:#e1bee7 !important}:global(.purple-text.text-lighten-4){color:#e1bee7 !important;caret-color:#e1bee7 !important}:global(.purple.lighten-3){background-color:#ce93d8 !important;border-color:#ce93d8 !important}:global(.purple-text.text-lighten-3){color:#ce93d8 !important;caret-color:#ce93d8 !important}:global(.purple.lighten-2){background-color:#ba68c8 !important;border-color:#ba68c8 !important}:global(.purple-text.text-lighten-2){color:#ba68c8 !important;caret-color:#ba68c8 !important}:global(.purple.lighten-1){background-color:#ab47bc !important;border-color:#ab47bc !important}:global(.purple-text.text-lighten-1){color:#ab47bc !important;caret-color:#ab47bc !important}:global(.purple.darken-1){background-color:#8e24aa !important;border-color:#8e24aa !important}:global(.purple-text.text-darken-1){color:#8e24aa !important;caret-color:#8e24aa !important}:global(.purple.darken-2){background-color:#7b1fa2 !important;border-color:#7b1fa2 !important}:global(.purple-text.text-darken-2){color:#7b1fa2 !important;caret-color:#7b1fa2 !important}:global(.purple.darken-3){background-color:#6a1b9a !important;border-color:#6a1b9a !important}:global(.purple-text.text-darken-3){color:#6a1b9a !important;caret-color:#6a1b9a !important}:global(.purple.darken-4){background-color:#4a148c !important;border-color:#4a148c !important}:global(.purple-text.text-darken-4){color:#4a148c !important;caret-color:#4a148c !important}:global(.purple.accent-1){background-color:#ea80fc !important;border-color:#ea80fc !important}:global(.purple-text.text-accent-1){color:#ea80fc !important;caret-color:#ea80fc !important}:global(.purple.accent-2){background-color:#e040fb !important;border-color:#e040fb !important}:global(.purple-text.text-accent-2){color:#e040fb !important;caret-color:#e040fb !important}:global(.purple.accent-3){background-color:#d500f9 !important;border-color:#d500f9 !important}:global(.purple-text.text-accent-3){color:#d500f9 !important;caret-color:#d500f9 !important}:global(.purple.accent-4){background-color:#a0f !important;border-color:#a0f !important}:global(.purple-text.text-accent-4){color:#a0f !important;caret-color:#a0f !important}:global(.deep-purple){background-color:#673ab7 !important;border-color:#673ab7 !important}:global(.deep-purple-text){color:#673ab7 !important;caret-color:#673ab7 !important}:global(.deep-purple.base){background-color:#673ab7 !important;border-color:#673ab7 !important}:global(.deep-purple-text.text-base){color:#673ab7 !important;caret-color:#673ab7 !important}:global(.deep-purple.lighten-5){background-color:#ede7f6 !important;border-color:#ede7f6 !important}:global(.deep-purple-text.text-lighten-5){color:#ede7f6 !important;caret-color:#ede7f6 !important}:global(.deep-purple.lighten-4){background-color:#d1c4e9 !important;border-color:#d1c4e9 !important}:global(.deep-purple-text.text-lighten-4){color:#d1c4e9 !important;caret-color:#d1c4e9 !important}:global(.deep-purple.lighten-3){background-color:#b39ddb !important;border-color:#b39ddb !important}:global(.deep-purple-text.text-lighten-3){color:#b39ddb !important;caret-color:#b39ddb !important}:global(.deep-purple.lighten-2){background-color:#9575cd !important;border-color:#9575cd !important}:global(.deep-purple-text.text-lighten-2){color:#9575cd !important;caret-color:#9575cd !important}:global(.deep-purple.lighten-1){background-color:#7e57c2 !important;border-color:#7e57c2 !important}:global(.deep-purple-text.text-lighten-1){color:#7e57c2 !important;caret-color:#7e57c2 !important}:global(.deep-purple.darken-1){background-color:#5e35b1 !important;border-color:#5e35b1 !important}:global(.deep-purple-text.text-darken-1){color:#5e35b1 !important;caret-color:#5e35b1 !important}:global(.deep-purple.darken-2){background-color:#512da8 !important;border-color:#512da8 !important}:global(.deep-purple-text.text-darken-2){color:#512da8 !important;caret-color:#512da8 !important}:global(.deep-purple.darken-3){background-color:#4527a0 !important;border-color:#4527a0 !important}:global(.deep-purple-text.text-darken-3){color:#4527a0 !important;caret-color:#4527a0 !important}:global(.deep-purple.darken-4){background-color:#311b92 !important;border-color:#311b92 !important}:global(.deep-purple-text.text-darken-4){color:#311b92 !important;caret-color:#311b92 !important}:global(.deep-purple.accent-1){background-color:#b388ff !important;border-color:#b388ff !important}:global(.deep-purple-text.text-accent-1){color:#b388ff !important;caret-color:#b388ff !important}:global(.deep-purple.accent-2){background-color:#7c4dff !important;border-color:#7c4dff !important}:global(.deep-purple-text.text-accent-2){color:#7c4dff !important;caret-color:#7c4dff !important}:global(.deep-purple.accent-3){background-color:#651fff !important;border-color:#651fff !important}:global(.deep-purple-text.text-accent-3){color:#651fff !important;caret-color:#651fff !important}:global(.deep-purple.accent-4){background-color:#6200ea !important;border-color:#6200ea !important}:global(.deep-purple-text.text-accent-4){color:#6200ea !important;caret-color:#6200ea !important}:global(.indigo){background-color:#3f51b5 !important;border-color:#3f51b5 !important}:global(.indigo-text){color:#3f51b5 !important;caret-color:#3f51b5 !important}:global(.indigo.base){background-color:#3f51b5 !important;border-color:#3f51b5 !important}:global(.indigo-text.text-base){color:#3f51b5 !important;caret-color:#3f51b5 !important}:global(.indigo.lighten-5){background-color:#e8eaf6 !important;border-color:#e8eaf6 !important}:global(.indigo-text.text-lighten-5){color:#e8eaf6 !important;caret-color:#e8eaf6 !important}:global(.indigo.lighten-4){background-color:#c5cae9 !important;border-color:#c5cae9 !important}:global(.indigo-text.text-lighten-4){color:#c5cae9 !important;caret-color:#c5cae9 !important}:global(.indigo.lighten-3){background-color:#9fa8da !important;border-color:#9fa8da !important}:global(.indigo-text.text-lighten-3){color:#9fa8da !important;caret-color:#9fa8da !important}:global(.indigo.lighten-2){background-color:#7986cb !important;border-color:#7986cb !important}:global(.indigo-text.text-lighten-2){color:#7986cb !important;caret-color:#7986cb !important}:global(.indigo.lighten-1){background-color:#5c6bc0 !important;border-color:#5c6bc0 !important}:global(.indigo-text.text-lighten-1){color:#5c6bc0 !important;caret-color:#5c6bc0 !important}:global(.indigo.darken-1){background-color:#3949ab !important;border-color:#3949ab !important}:global(.indigo-text.text-darken-1){color:#3949ab !important;caret-color:#3949ab !important}:global(.indigo.darken-2){background-color:#303f9f !important;border-color:#303f9f !important}:global(.indigo-text.text-darken-2){color:#303f9f !important;caret-color:#303f9f !important}:global(.indigo.darken-3){background-color:#283593 !important;border-color:#283593 !important}:global(.indigo-text.text-darken-3){color:#283593 !important;caret-color:#283593 !important}:global(.indigo.darken-4){background-color:#1a237e !important;border-color:#1a237e !important}:global(.indigo-text.text-darken-4){color:#1a237e !important;caret-color:#1a237e !important}:global(.indigo.accent-1){background-color:#8c9eff !important;border-color:#8c9eff !important}:global(.indigo-text.text-accent-1){color:#8c9eff !important;caret-color:#8c9eff !important}:global(.indigo.accent-2){background-color:#536dfe !important;border-color:#536dfe !important}:global(.indigo-text.text-accent-2){color:#536dfe !important;caret-color:#536dfe !important}:global(.indigo.accent-3){background-color:#3d5afe !important;border-color:#3d5afe !important}:global(.indigo-text.text-accent-3){color:#3d5afe !important;caret-color:#3d5afe !important}:global(.indigo.accent-4){background-color:#304ffe !important;border-color:#304ffe !important}:global(.indigo-text.text-accent-4){color:#304ffe !important;caret-color:#304ffe !important}:global(.blue){background-color:#2196f3 !important;border-color:#2196f3 !important}:global(.blue-text){color:#2196f3 !important;caret-color:#2196f3 !important}:global(.blue.base){background-color:#2196f3 !important;border-color:#2196f3 !important}:global(.blue-text.text-base){color:#2196f3 !important;caret-color:#2196f3 !important}:global(.blue.lighten-5){background-color:#e3f2fd !important;border-color:#e3f2fd !important}:global(.blue-text.text-lighten-5){color:#e3f2fd !important;caret-color:#e3f2fd !important}:global(.blue.lighten-4){background-color:#bbdefb !important;border-color:#bbdefb !important}:global(.blue-text.text-lighten-4){color:#bbdefb !important;caret-color:#bbdefb !important}:global(.blue.lighten-3){background-color:#90caf9 !important;border-color:#90caf9 !important}:global(.blue-text.text-lighten-3){color:#90caf9 !important;caret-color:#90caf9 !important}:global(.blue.lighten-2){background-color:#64b5f6 !important;border-color:#64b5f6 !important}:global(.blue-text.text-lighten-2){color:#64b5f6 !important;caret-color:#64b5f6 !important}:global(.blue.lighten-1){background-color:#42a5f5 !important;border-color:#42a5f5 !important}:global(.blue-text.text-lighten-1){color:#42a5f5 !important;caret-color:#42a5f5 !important}:global(.blue.darken-1){background-color:#1e88e5 !important;border-color:#1e88e5 !important}:global(.blue-text.text-darken-1){color:#1e88e5 !important;caret-color:#1e88e5 !important}:global(.blue.darken-2){background-color:#1976d2 !important;border-color:#1976d2 !important}:global(.blue-text.text-darken-2){color:#1976d2 !important;caret-color:#1976d2 !important}:global(.blue.darken-3){background-color:#1565c0 !important;border-color:#1565c0 !important}:global(.blue-text.text-darken-3){color:#1565c0 !important;caret-color:#1565c0 !important}:global(.blue.darken-4){background-color:#0d47a1 !important;border-color:#0d47a1 !important}:global(.blue-text.text-darken-4){color:#0d47a1 !important;caret-color:#0d47a1 !important}:global(.blue.accent-1){background-color:#82b1ff !important;border-color:#82b1ff !important}:global(.blue-text.text-accent-1){color:#82b1ff !important;caret-color:#82b1ff !important}:global(.blue.accent-2){background-color:#448aff !important;border-color:#448aff !important}:global(.blue-text.text-accent-2){color:#448aff !important;caret-color:#448aff !important}:global(.blue.accent-3){background-color:#2979ff !important;border-color:#2979ff !important}:global(.blue-text.text-accent-3){color:#2979ff !important;caret-color:#2979ff !important}:global(.blue.accent-4){background-color:#2962ff !important;border-color:#2962ff !important}:global(.blue-text.text-accent-4){color:#2962ff !important;caret-color:#2962ff !important}:global(.light-blue){background-color:#03a9f4 !important;border-color:#03a9f4 !important}:global(.light-blue-text){color:#03a9f4 !important;caret-color:#03a9f4 !important}:global(.light-blue.base){background-color:#03a9f4 !important;border-color:#03a9f4 !important}:global(.light-blue-text.text-base){color:#03a9f4 !important;caret-color:#03a9f4 !important}:global(.light-blue.lighten-5){background-color:#e1f5fe !important;border-color:#e1f5fe !important}:global(.light-blue-text.text-lighten-5){color:#e1f5fe !important;caret-color:#e1f5fe !important}:global(.light-blue.lighten-4){background-color:#b3e5fc !important;border-color:#b3e5fc !important}:global(.light-blue-text.text-lighten-4){color:#b3e5fc !important;caret-color:#b3e5fc !important}:global(.light-blue.lighten-3){background-color:#81d4fa !important;border-color:#81d4fa !important}:global(.light-blue-text.text-lighten-3){color:#81d4fa !important;caret-color:#81d4fa !important}:global(.light-blue.lighten-2){background-color:#4fc3f7 !important;border-color:#4fc3f7 !important}:global(.light-blue-text.text-lighten-2){color:#4fc3f7 !important;caret-color:#4fc3f7 !important}:global(.light-blue.lighten-1){background-color:#29b6f6 !important;border-color:#29b6f6 !important}:global(.light-blue-text.text-lighten-1){color:#29b6f6 !important;caret-color:#29b6f6 !important}:global(.light-blue.darken-1){background-color:#039be5 !important;border-color:#039be5 !important}:global(.light-blue-text.text-darken-1){color:#039be5 !important;caret-color:#039be5 !important}:global(.light-blue.darken-2){background-color:#0288d1 !important;border-color:#0288d1 !important}:global(.light-blue-text.text-darken-2){color:#0288d1 !important;caret-color:#0288d1 !important}:global(.light-blue.darken-3){background-color:#0277bd !important;border-color:#0277bd !important}:global(.light-blue-text.text-darken-3){color:#0277bd !important;caret-color:#0277bd !important}:global(.light-blue.darken-4){background-color:#01579b !important;border-color:#01579b !important}:global(.light-blue-text.text-darken-4){color:#01579b !important;caret-color:#01579b !important}:global(.light-blue.accent-1){background-color:#80d8ff !important;border-color:#80d8ff !important}:global(.light-blue-text.text-accent-1){color:#80d8ff !important;caret-color:#80d8ff !important}:global(.light-blue.accent-2){background-color:#40c4ff !important;border-color:#40c4ff !important}:global(.light-blue-text.text-accent-2){color:#40c4ff !important;caret-color:#40c4ff !important}:global(.light-blue.accent-3){background-color:#00b0ff !important;border-color:#00b0ff !important}:global(.light-blue-text.text-accent-3){color:#00b0ff !important;caret-color:#00b0ff !important}:global(.light-blue.accent-4){background-color:#0091ea !important;border-color:#0091ea !important}:global(.light-blue-text.text-accent-4){color:#0091ea !important;caret-color:#0091ea !important}:global(.cyan){background-color:#00bcd4 !important;border-color:#00bcd4 !important}:global(.cyan-text){color:#00bcd4 !important;caret-color:#00bcd4 !important}:global(.cyan.base){background-color:#00bcd4 !important;border-color:#00bcd4 !important}:global(.cyan-text.text-base){color:#00bcd4 !important;caret-color:#00bcd4 !important}:global(.cyan.lighten-5){background-color:#e0f7fa !important;border-color:#e0f7fa !important}:global(.cyan-text.text-lighten-5){color:#e0f7fa !important;caret-color:#e0f7fa !important}:global(.cyan.lighten-4){background-color:#b2ebf2 !important;border-color:#b2ebf2 !important}:global(.cyan-text.text-lighten-4){color:#b2ebf2 !important;caret-color:#b2ebf2 !important}:global(.cyan.lighten-3){background-color:#80deea !important;border-color:#80deea !important}:global(.cyan-text.text-lighten-3){color:#80deea !important;caret-color:#80deea !important}:global(.cyan.lighten-2){background-color:#4dd0e1 !important;border-color:#4dd0e1 !important}:global(.cyan-text.text-lighten-2){color:#4dd0e1 !important;caret-color:#4dd0e1 !important}:global(.cyan.lighten-1){background-color:#26c6da !important;border-color:#26c6da !important}:global(.cyan-text.text-lighten-1){color:#26c6da !important;caret-color:#26c6da !important}:global(.cyan.darken-1){background-color:#00acc1 !important;border-color:#00acc1 !important}:global(.cyan-text.text-darken-1){color:#00acc1 !important;caret-color:#00acc1 !important}:global(.cyan.darken-2){background-color:#0097a7 !important;border-color:#0097a7 !important}:global(.cyan-text.text-darken-2){color:#0097a7 !important;caret-color:#0097a7 !important}:global(.cyan.darken-3){background-color:#00838f !important;border-color:#00838f !important}:global(.cyan-text.text-darken-3){color:#00838f !important;caret-color:#00838f !important}:global(.cyan.darken-4){background-color:#006064 !important;border-color:#006064 !important}:global(.cyan-text.text-darken-4){color:#006064 !important;caret-color:#006064 !important}:global(.cyan.accent-1){background-color:#84ffff !important;border-color:#84ffff !important}:global(.cyan-text.text-accent-1){color:#84ffff !important;caret-color:#84ffff !important}:global(.cyan.accent-2){background-color:#18ffff !important;border-color:#18ffff !important}:global(.cyan-text.text-accent-2){color:#18ffff !important;caret-color:#18ffff !important}:global(.cyan.accent-3){background-color:#00e5ff !important;border-color:#00e5ff !important}:global(.cyan-text.text-accent-3){color:#00e5ff !important;caret-color:#00e5ff !important}:global(.cyan.accent-4){background-color:#00b8d4 !important;border-color:#00b8d4 !important}:global(.cyan-text.text-accent-4){color:#00b8d4 !important;caret-color:#00b8d4 !important}:global(.teal){background-color:#009688 !important;border-color:#009688 !important}:global(.teal-text){color:#009688 !important;caret-color:#009688 !important}:global(.teal.base){background-color:#009688 !important;border-color:#009688 !important}:global(.teal-text.text-base){color:#009688 !important;caret-color:#009688 !important}:global(.teal.lighten-5){background-color:#e0f2f1 !important;border-color:#e0f2f1 !important}:global(.teal-text.text-lighten-5){color:#e0f2f1 !important;caret-color:#e0f2f1 !important}:global(.teal.lighten-4){background-color:#b2dfdb !important;border-color:#b2dfdb !important}:global(.teal-text.text-lighten-4){color:#b2dfdb !important;caret-color:#b2dfdb !important}:global(.teal.lighten-3){background-color:#80cbc4 !important;border-color:#80cbc4 !important}:global(.teal-text.text-lighten-3){color:#80cbc4 !important;caret-color:#80cbc4 !important}:global(.teal.lighten-2){background-color:#4db6ac !important;border-color:#4db6ac !important}:global(.teal-text.text-lighten-2){color:#4db6ac !important;caret-color:#4db6ac !important}:global(.teal.lighten-1){background-color:#26a69a !important;border-color:#26a69a !important}:global(.teal-text.text-lighten-1){color:#26a69a !important;caret-color:#26a69a !important}:global(.teal.darken-1){background-color:#00897b !important;border-color:#00897b !important}:global(.teal-text.text-darken-1){color:#00897b !important;caret-color:#00897b !important}:global(.teal.darken-2){background-color:#00796b !important;border-color:#00796b !important}:global(.teal-text.text-darken-2){color:#00796b !important;caret-color:#00796b !important}:global(.teal.darken-3){background-color:#00695c !important;border-color:#00695c !important}:global(.teal-text.text-darken-3){color:#00695c !important;caret-color:#00695c !important}:global(.teal.darken-4){background-color:#004d40 !important;border-color:#004d40 !important}:global(.teal-text.text-darken-4){color:#004d40 !important;caret-color:#004d40 !important}:global(.teal.accent-1){background-color:#a7ffeb !important;border-color:#a7ffeb !important}:global(.teal-text.text-accent-1){color:#a7ffeb !important;caret-color:#a7ffeb !important}:global(.teal.accent-2){background-color:#64ffda !important;border-color:#64ffda !important}:global(.teal-text.text-accent-2){color:#64ffda !important;caret-color:#64ffda !important}:global(.teal.accent-3){background-color:#1de9b6 !important;border-color:#1de9b6 !important}:global(.teal-text.text-accent-3){color:#1de9b6 !important;caret-color:#1de9b6 !important}:global(.teal.accent-4){background-color:#00bfa5 !important;border-color:#00bfa5 !important}:global(.teal-text.text-accent-4){color:#00bfa5 !important;caret-color:#00bfa5 !important}:global(.green){background-color:#4caf50 !important;border-color:#4caf50 !important}:global(.green-text){color:#4caf50 !important;caret-color:#4caf50 !important}:global(.green.base){background-color:#4caf50 !important;border-color:#4caf50 !important}:global(.green-text.text-base){color:#4caf50 !important;caret-color:#4caf50 !important}:global(.green.lighten-5){background-color:#e8f5e9 !important;border-color:#e8f5e9 !important}:global(.green-text.text-lighten-5){color:#e8f5e9 !important;caret-color:#e8f5e9 !important}:global(.green.lighten-4){background-color:#c8e6c9 !important;border-color:#c8e6c9 !important}:global(.green-text.text-lighten-4){color:#c8e6c9 !important;caret-color:#c8e6c9 !important}:global(.green.lighten-3){background-color:#a5d6a7 !important;border-color:#a5d6a7 !important}:global(.green-text.text-lighten-3){color:#a5d6a7 !important;caret-color:#a5d6a7 !important}:global(.green.lighten-2){background-color:#81c784 !important;border-color:#81c784 !important}:global(.green-text.text-lighten-2){color:#81c784 !important;caret-color:#81c784 !important}:global(.green.lighten-1){background-color:#66bb6a !important;border-color:#66bb6a !important}:global(.green-text.text-lighten-1){color:#66bb6a !important;caret-color:#66bb6a !important}:global(.green.darken-1){background-color:#43a047 !important;border-color:#43a047 !important}:global(.green-text.text-darken-1){color:#43a047 !important;caret-color:#43a047 !important}:global(.green.darken-2){background-color:#388e3c !important;border-color:#388e3c !important}:global(.green-text.text-darken-2){color:#388e3c !important;caret-color:#388e3c !important}:global(.green.darken-3){background-color:#2e7d32 !important;border-color:#2e7d32 !important}:global(.green-text.text-darken-3){color:#2e7d32 !important;caret-color:#2e7d32 !important}:global(.green.darken-4){background-color:#1b5e20 !important;border-color:#1b5e20 !important}:global(.green-text.text-darken-4){color:#1b5e20 !important;caret-color:#1b5e20 !important}:global(.green.accent-1){background-color:#b9f6ca !important;border-color:#b9f6ca !important}:global(.green-text.text-accent-1){color:#b9f6ca !important;caret-color:#b9f6ca !important}:global(.green.accent-2){background-color:#69f0ae !important;border-color:#69f0ae !important}:global(.green-text.text-accent-2){color:#69f0ae !important;caret-color:#69f0ae !important}:global(.green.accent-3){background-color:#00e676 !important;border-color:#00e676 !important}:global(.green-text.text-accent-3){color:#00e676 !important;caret-color:#00e676 !important}:global(.green.accent-4){background-color:#00c853 !important;border-color:#00c853 !important}:global(.green-text.text-accent-4){color:#00c853 !important;caret-color:#00c853 !important}:global(.light-green){background-color:#8bc34a !important;border-color:#8bc34a !important}:global(.light-green-text){color:#8bc34a !important;caret-color:#8bc34a !important}:global(.light-green.base){background-color:#8bc34a !important;border-color:#8bc34a !important}:global(.light-green-text.text-base){color:#8bc34a !important;caret-color:#8bc34a !important}:global(.light-green.lighten-5){background-color:#f1f8e9 !important;border-color:#f1f8e9 !important}:global(.light-green-text.text-lighten-5){color:#f1f8e9 !important;caret-color:#f1f8e9 !important}:global(.light-green.lighten-4){background-color:#dcedc8 !important;border-color:#dcedc8 !important}:global(.light-green-text.text-lighten-4){color:#dcedc8 !important;caret-color:#dcedc8 !important}:global(.light-green.lighten-3){background-color:#c5e1a5 !important;border-color:#c5e1a5 !important}:global(.light-green-text.text-lighten-3){color:#c5e1a5 !important;caret-color:#c5e1a5 !important}:global(.light-green.lighten-2){background-color:#aed581 !important;border-color:#aed581 !important}:global(.light-green-text.text-lighten-2){color:#aed581 !important;caret-color:#aed581 !important}:global(.light-green.lighten-1){background-color:#9ccc65 !important;border-color:#9ccc65 !important}:global(.light-green-text.text-lighten-1){color:#9ccc65 !important;caret-color:#9ccc65 !important}:global(.light-green.darken-1){background-color:#7cb342 !important;border-color:#7cb342 !important}:global(.light-green-text.text-darken-1){color:#7cb342 !important;caret-color:#7cb342 !important}:global(.light-green.darken-2){background-color:#689f38 !important;border-color:#689f38 !important}:global(.light-green-text.text-darken-2){color:#689f38 !important;caret-color:#689f38 !important}:global(.light-green.darken-3){background-color:#558b2f !important;border-color:#558b2f !important}:global(.light-green-text.text-darken-3){color:#558b2f !important;caret-color:#558b2f !important}:global(.light-green.darken-4){background-color:#33691e !important;border-color:#33691e !important}:global(.light-green-text.text-darken-4){color:#33691e !important;caret-color:#33691e !important}:global(.light-green.accent-1){background-color:#ccff90 !important;border-color:#ccff90 !important}:global(.light-green-text.text-accent-1){color:#ccff90 !important;caret-color:#ccff90 !important}:global(.light-green.accent-2){background-color:#b2ff59 !important;border-color:#b2ff59 !important}:global(.light-green-text.text-accent-2){color:#b2ff59 !important;caret-color:#b2ff59 !important}:global(.light-green.accent-3){background-color:#76ff03 !important;border-color:#76ff03 !important}:global(.light-green-text.text-accent-3){color:#76ff03 !important;caret-color:#76ff03 !important}:global(.light-green.accent-4){background-color:#64dd17 !important;border-color:#64dd17 !important}:global(.light-green-text.text-accent-4){color:#64dd17 !important;caret-color:#64dd17 !important}:global(.lime){background-color:#cddc39 !important;border-color:#cddc39 !important}:global(.lime-text){color:#cddc39 !important;caret-color:#cddc39 !important}:global(.lime.base){background-color:#cddc39 !important;border-color:#cddc39 !important}:global(.lime-text.text-base){color:#cddc39 !important;caret-color:#cddc39 !important}:global(.lime.lighten-5){background-color:#f9fbe7 !important;border-color:#f9fbe7 !important}:global(.lime-text.text-lighten-5){color:#f9fbe7 !important;caret-color:#f9fbe7 !important}:global(.lime.lighten-4){background-color:#f0f4c3 !important;border-color:#f0f4c3 !important}:global(.lime-text.text-lighten-4){color:#f0f4c3 !important;caret-color:#f0f4c3 !important}:global(.lime.lighten-3){background-color:#e6ee9c !important;border-color:#e6ee9c !important}:global(.lime-text.text-lighten-3){color:#e6ee9c !important;caret-color:#e6ee9c !important}:global(.lime.lighten-2){background-color:#dce775 !important;border-color:#dce775 !important}:global(.lime-text.text-lighten-2){color:#dce775 !important;caret-color:#dce775 !important}:global(.lime.lighten-1){background-color:#d4e157 !important;border-color:#d4e157 !important}:global(.lime-text.text-lighten-1){color:#d4e157 !important;caret-color:#d4e157 !important}:global(.lime.darken-1){background-color:#c0ca33 !important;border-color:#c0ca33 !important}:global(.lime-text.text-darken-1){color:#c0ca33 !important;caret-color:#c0ca33 !important}:global(.lime.darken-2){background-color:#afb42b !important;border-color:#afb42b !important}:global(.lime-text.text-darken-2){color:#afb42b !important;caret-color:#afb42b !important}:global(.lime.darken-3){background-color:#9e9d24 !important;border-color:#9e9d24 !important}:global(.lime-text.text-darken-3){color:#9e9d24 !important;caret-color:#9e9d24 !important}:global(.lime.darken-4){background-color:#827717 !important;border-color:#827717 !important}:global(.lime-text.text-darken-4){color:#827717 !important;caret-color:#827717 !important}:global(.lime.accent-1){background-color:#f4ff81 !important;border-color:#f4ff81 !important}:global(.lime-text.text-accent-1){color:#f4ff81 !important;caret-color:#f4ff81 !important}:global(.lime.accent-2){background-color:#eeff41 !important;border-color:#eeff41 !important}:global(.lime-text.text-accent-2){color:#eeff41 !important;caret-color:#eeff41 !important}:global(.lime.accent-3){background-color:#c6ff00 !important;border-color:#c6ff00 !important}:global(.lime-text.text-accent-3){color:#c6ff00 !important;caret-color:#c6ff00 !important}:global(.lime.accent-4){background-color:#aeea00 !important;border-color:#aeea00 !important}:global(.lime-text.text-accent-4){color:#aeea00 !important;caret-color:#aeea00 !important}:global(.yellow){background-color:#ffeb3b !important;border-color:#ffeb3b !important}:global(.yellow-text){color:#ffeb3b !important;caret-color:#ffeb3b !important}:global(.yellow.base){background-color:#ffeb3b !important;border-color:#ffeb3b !important}:global(.yellow-text.text-base){color:#ffeb3b !important;caret-color:#ffeb3b !important}:global(.yellow.lighten-5){background-color:#fffde7 !important;border-color:#fffde7 !important}:global(.yellow-text.text-lighten-5){color:#fffde7 !important;caret-color:#fffde7 !important}:global(.yellow.lighten-4){background-color:#fff9c4 !important;border-color:#fff9c4 !important}:global(.yellow-text.text-lighten-4){color:#fff9c4 !important;caret-color:#fff9c4 !important}:global(.yellow.lighten-3){background-color:#fff59d !important;border-color:#fff59d !important}:global(.yellow-text.text-lighten-3){color:#fff59d !important;caret-color:#fff59d !important}:global(.yellow.lighten-2){background-color:#fff176 !important;border-color:#fff176 !important}:global(.yellow-text.text-lighten-2){color:#fff176 !important;caret-color:#fff176 !important}:global(.yellow.lighten-1){background-color:#ffee58 !important;border-color:#ffee58 !important}:global(.yellow-text.text-lighten-1){color:#ffee58 !important;caret-color:#ffee58 !important}:global(.yellow.darken-1){background-color:#fdd835 !important;border-color:#fdd835 !important}:global(.yellow-text.text-darken-1){color:#fdd835 !important;caret-color:#fdd835 !important}:global(.yellow.darken-2){background-color:#fbc02d !important;border-color:#fbc02d !important}:global(.yellow-text.text-darken-2){color:#fbc02d !important;caret-color:#fbc02d !important}:global(.yellow.darken-3){background-color:#f9a825 !important;border-color:#f9a825 !important}:global(.yellow-text.text-darken-3){color:#f9a825 !important;caret-color:#f9a825 !important}:global(.yellow.darken-4){background-color:#f57f17 !important;border-color:#f57f17 !important}:global(.yellow-text.text-darken-4){color:#f57f17 !important;caret-color:#f57f17 !important}:global(.yellow.accent-1){background-color:#ffff8d !important;border-color:#ffff8d !important}:global(.yellow-text.text-accent-1){color:#ffff8d !important;caret-color:#ffff8d !important}:global(.yellow.accent-2){background-color:#ff0 !important;border-color:#ff0 !important}:global(.yellow-text.text-accent-2){color:#ff0 !important;caret-color:#ff0 !important}:global(.yellow.accent-3){background-color:#ffea00 !important;border-color:#ffea00 !important}:global(.yellow-text.text-accent-3){color:#ffea00 !important;caret-color:#ffea00 !important}:global(.yellow.accent-4){background-color:#ffd600 !important;border-color:#ffd600 !important}:global(.yellow-text.text-accent-4){color:#ffd600 !important;caret-color:#ffd600 !important}:global(.amber){background-color:#ffc107 !important;border-color:#ffc107 !important}:global(.amber-text){color:#ffc107 !important;caret-color:#ffc107 !important}:global(.amber.base){background-color:#ffc107 !important;border-color:#ffc107 !important}:global(.amber-text.text-base){color:#ffc107 !important;caret-color:#ffc107 !important}:global(.amber.lighten-5){background-color:#fff8e1 !important;border-color:#fff8e1 !important}:global(.amber-text.text-lighten-5){color:#fff8e1 !important;caret-color:#fff8e1 !important}:global(.amber.lighten-4){background-color:#ffecb3 !important;border-color:#ffecb3 !important}:global(.amber-text.text-lighten-4){color:#ffecb3 !important;caret-color:#ffecb3 !important}:global(.amber.lighten-3){background-color:#ffe082 !important;border-color:#ffe082 !important}:global(.amber-text.text-lighten-3){color:#ffe082 !important;caret-color:#ffe082 !important}:global(.amber.lighten-2){background-color:#ffd54f !important;border-color:#ffd54f !important}:global(.amber-text.text-lighten-2){color:#ffd54f !important;caret-color:#ffd54f !important}:global(.amber.lighten-1){background-color:#ffca28 !important;border-color:#ffca28 !important}:global(.amber-text.text-lighten-1){color:#ffca28 !important;caret-color:#ffca28 !important}:global(.amber.darken-1){background-color:#ffb300 !important;border-color:#ffb300 !important}:global(.amber-text.text-darken-1){color:#ffb300 !important;caret-color:#ffb300 !important}:global(.amber.darken-2){background-color:#ffa000 !important;border-color:#ffa000 !important}:global(.amber-text.text-darken-2){color:#ffa000 !important;caret-color:#ffa000 !important}:global(.amber.darken-3){background-color:#ff8f00 !important;border-color:#ff8f00 !important}:global(.amber-text.text-darken-3){color:#ff8f00 !important;caret-color:#ff8f00 !important}:global(.amber.darken-4){background-color:#ff6f00 !important;border-color:#ff6f00 !important}:global(.amber-text.text-darken-4){color:#ff6f00 !important;caret-color:#ff6f00 !important}:global(.amber.accent-1){background-color:#ffe57f !important;border-color:#ffe57f !important}:global(.amber-text.text-accent-1){color:#ffe57f !important;caret-color:#ffe57f !important}:global(.amber.accent-2){background-color:#ffd740 !important;border-color:#ffd740 !important}:global(.amber-text.text-accent-2){color:#ffd740 !important;caret-color:#ffd740 !important}:global(.amber.accent-3){background-color:#ffc400 !important;border-color:#ffc400 !important}:global(.amber-text.text-accent-3){color:#ffc400 !important;caret-color:#ffc400 !important}:global(.amber.accent-4){background-color:#ffab00 !important;border-color:#ffab00 !important}:global(.amber-text.text-accent-4){color:#ffab00 !important;caret-color:#ffab00 !important}:global(.orange){background-color:#ff9800 !important;border-color:#ff9800 !important}:global(.orange-text){color:#ff9800 !important;caret-color:#ff9800 !important}:global(.orange.base){background-color:#ff9800 !important;border-color:#ff9800 !important}:global(.orange-text.text-base){color:#ff9800 !important;caret-color:#ff9800 !important}:global(.orange.lighten-5){background-color:#fff3e0 !important;border-color:#fff3e0 !important}:global(.orange-text.text-lighten-5){color:#fff3e0 !important;caret-color:#fff3e0 !important}:global(.orange.lighten-4){background-color:#ffe0b2 !important;border-color:#ffe0b2 !important}:global(.orange-text.text-lighten-4){color:#ffe0b2 !important;caret-color:#ffe0b2 !important}:global(.orange.lighten-3){background-color:#ffcc80 !important;border-color:#ffcc80 !important}:global(.orange-text.text-lighten-3){color:#ffcc80 !important;caret-color:#ffcc80 !important}:global(.orange.lighten-2){background-color:#ffb74d !important;border-color:#ffb74d !important}:global(.orange-text.text-lighten-2){color:#ffb74d !important;caret-color:#ffb74d !important}:global(.orange.lighten-1){background-color:#ffa726 !important;border-color:#ffa726 !important}:global(.orange-text.text-lighten-1){color:#ffa726 !important;caret-color:#ffa726 !important}:global(.orange.darken-1){background-color:#fb8c00 !important;border-color:#fb8c00 !important}:global(.orange-text.text-darken-1){color:#fb8c00 !important;caret-color:#fb8c00 !important}:global(.orange.darken-2){background-color:#f57c00 !important;border-color:#f57c00 !important}:global(.orange-text.text-darken-2){color:#f57c00 !important;caret-color:#f57c00 !important}:global(.orange.darken-3){background-color:#ef6c00 !important;border-color:#ef6c00 !important}:global(.orange-text.text-darken-3){color:#ef6c00 !important;caret-color:#ef6c00 !important}:global(.orange.darken-4){background-color:#e65100 !important;border-color:#e65100 !important}:global(.orange-text.text-darken-4){color:#e65100 !important;caret-color:#e65100 !important}:global(.orange.accent-1){background-color:#ffd180 !important;border-color:#ffd180 !important}:global(.orange-text.text-accent-1){color:#ffd180 !important;caret-color:#ffd180 !important}:global(.orange.accent-2){background-color:#ffab40 !important;border-color:#ffab40 !important}:global(.orange-text.text-accent-2){color:#ffab40 !important;caret-color:#ffab40 !important}:global(.orange.accent-3){background-color:#ff9100 !important;border-color:#ff9100 !important}:global(.orange-text.text-accent-3){color:#ff9100 !important;caret-color:#ff9100 !important}:global(.orange.accent-4){background-color:#ff6d00 !important;border-color:#ff6d00 !important}:global(.orange-text.text-accent-4){color:#ff6d00 !important;caret-color:#ff6d00 !important}:global(.deep-orange){background-color:#ff5722 !important;border-color:#ff5722 !important}:global(.deep-orange-text){color:#ff5722 !important;caret-color:#ff5722 !important}:global(.deep-orange.base){background-color:#ff5722 !important;border-color:#ff5722 !important}:global(.deep-orange-text.text-base){color:#ff5722 !important;caret-color:#ff5722 !important}:global(.deep-orange.lighten-5){background-color:#fbe9e7 !important;border-color:#fbe9e7 !important}:global(.deep-orange-text.text-lighten-5){color:#fbe9e7 !important;caret-color:#fbe9e7 !important}:global(.deep-orange.lighten-4){background-color:#ffccbc !important;border-color:#ffccbc !important}:global(.deep-orange-text.text-lighten-4){color:#ffccbc !important;caret-color:#ffccbc !important}:global(.deep-orange.lighten-3){background-color:#ffab91 !important;border-color:#ffab91 !important}:global(.deep-orange-text.text-lighten-3){color:#ffab91 !important;caret-color:#ffab91 !important}:global(.deep-orange.lighten-2){background-color:#ff8a65 !important;border-color:#ff8a65 !important}:global(.deep-orange-text.text-lighten-2){color:#ff8a65 !important;caret-color:#ff8a65 !important}:global(.deep-orange.lighten-1){background-color:#ff7043 !important;border-color:#ff7043 !important}:global(.deep-orange-text.text-lighten-1){color:#ff7043 !important;caret-color:#ff7043 !important}:global(.deep-orange.darken-1){background-color:#f4511e !important;border-color:#f4511e !important}:global(.deep-orange-text.text-darken-1){color:#f4511e !important;caret-color:#f4511e !important}:global(.deep-orange.darken-2){background-color:#e64a19 !important;border-color:#e64a19 !important}:global(.deep-orange-text.text-darken-2){color:#e64a19 !important;caret-color:#e64a19 !important}:global(.deep-orange.darken-3){background-color:#d84315 !important;border-color:#d84315 !important}:global(.deep-orange-text.text-darken-3){color:#d84315 !important;caret-color:#d84315 !important}:global(.deep-orange.darken-4){background-color:#bf360c !important;border-color:#bf360c !important}:global(.deep-orange-text.text-darken-4){color:#bf360c !important;caret-color:#bf360c !important}:global(.deep-orange.accent-1){background-color:#ff9e80 !important;border-color:#ff9e80 !important}:global(.deep-orange-text.text-accent-1){color:#ff9e80 !important;caret-color:#ff9e80 !important}:global(.deep-orange.accent-2){background-color:#ff6e40 !important;border-color:#ff6e40 !important}:global(.deep-orange-text.text-accent-2){color:#ff6e40 !important;caret-color:#ff6e40 !important}:global(.deep-orange.accent-3){background-color:#ff3d00 !important;border-color:#ff3d00 !important}:global(.deep-orange-text.text-accent-3){color:#ff3d00 !important;caret-color:#ff3d00 !important}:global(.deep-orange.accent-4){background-color:#dd2c00 !important;border-color:#dd2c00 !important}:global(.deep-orange-text.text-accent-4){color:#dd2c00 !important;caret-color:#dd2c00 !important}:global(.brown){background-color:#795548 !important;border-color:#795548 !important}:global(.brown-text){color:#795548 !important;caret-color:#795548 !important}:global(.brown.base){background-color:#795548 !important;border-color:#795548 !important}:global(.brown-text.text-base){color:#795548 !important;caret-color:#795548 !important}:global(.brown.lighten-5){background-color:#efebe9 !important;border-color:#efebe9 !important}:global(.brown-text.text-lighten-5){color:#efebe9 !important;caret-color:#efebe9 !important}:global(.brown.lighten-4){background-color:#d7ccc8 !important;border-color:#d7ccc8 !important}:global(.brown-text.text-lighten-4){color:#d7ccc8 !important;caret-color:#d7ccc8 !important}:global(.brown.lighten-3){background-color:#bcaaa4 !important;border-color:#bcaaa4 !important}:global(.brown-text.text-lighten-3){color:#bcaaa4 !important;caret-color:#bcaaa4 !important}:global(.brown.lighten-2){background-color:#a1887f !important;border-color:#a1887f !important}:global(.brown-text.text-lighten-2){color:#a1887f !important;caret-color:#a1887f !important}:global(.brown.lighten-1){background-color:#8d6e63 !important;border-color:#8d6e63 !important}:global(.brown-text.text-lighten-1){color:#8d6e63 !important;caret-color:#8d6e63 !important}:global(.brown.darken-1){background-color:#6d4c41 !important;border-color:#6d4c41 !important}:global(.brown-text.text-darken-1){color:#6d4c41 !important;caret-color:#6d4c41 !important}:global(.brown.darken-2){background-color:#5d4037 !important;border-color:#5d4037 !important}:global(.brown-text.text-darken-2){color:#5d4037 !important;caret-color:#5d4037 !important}:global(.brown.darken-3){background-color:#4e342e !important;border-color:#4e342e !important}:global(.brown-text.text-darken-3){color:#4e342e !important;caret-color:#4e342e !important}:global(.brown.darken-4){background-color:#3e2723 !important;border-color:#3e2723 !important}:global(.brown-text.text-darken-4){color:#3e2723 !important;caret-color:#3e2723 !important}:global(.blue-grey){background-color:#607d8b !important;border-color:#607d8b !important}:global(.blue-grey-text){color:#607d8b !important;caret-color:#607d8b !important}:global(.blue-grey.base){background-color:#607d8b !important;border-color:#607d8b !important}:global(.blue-grey-text.text-base){color:#607d8b !important;caret-color:#607d8b !important}:global(.blue-grey.lighten-5){background-color:#eceff1 !important;border-color:#eceff1 !important}:global(.blue-grey-text.text-lighten-5){color:#eceff1 !important;caret-color:#eceff1 !important}:global(.blue-grey.lighten-4){background-color:#cfd8dc !important;border-color:#cfd8dc !important}:global(.blue-grey-text.text-lighten-4){color:#cfd8dc !important;caret-color:#cfd8dc !important}:global(.blue-grey.lighten-3){background-color:#b0bec5 !important;border-color:#b0bec5 !important}:global(.blue-grey-text.text-lighten-3){color:#b0bec5 !important;caret-color:#b0bec5 !important}:global(.blue-grey.lighten-2){background-color:#90a4ae !important;border-color:#90a4ae !important}:global(.blue-grey-text.text-lighten-2){color:#90a4ae !important;caret-color:#90a4ae !important}:global(.blue-grey.lighten-1){background-color:#78909c !important;border-color:#78909c !important}:global(.blue-grey-text.text-lighten-1){color:#78909c !important;caret-color:#78909c !important}:global(.blue-grey.darken-1){background-color:#546e7a !important;border-color:#546e7a !important}:global(.blue-grey-text.text-darken-1){color:#546e7a !important;caret-color:#546e7a !important}:global(.blue-grey.darken-2){background-color:#455a64 !important;border-color:#455a64 !important}:global(.blue-grey-text.text-darken-2){color:#455a64 !important;caret-color:#455a64 !important}:global(.blue-grey.darken-3){background-color:#37474f !important;border-color:#37474f !important}:global(.blue-grey-text.text-darken-3){color:#37474f !important;caret-color:#37474f !important}:global(.blue-grey.darken-4){background-color:#263238 !important;border-color:#263238 !important}:global(.blue-grey-text.text-darken-4){color:#263238 !important;caret-color:#263238 !important}:global(.grey){background-color:#9e9e9e !important;border-color:#9e9e9e !important}:global(.grey-text){color:#9e9e9e !important;caret-color:#9e9e9e !important}:global(.grey.base){background-color:#9e9e9e !important;border-color:#9e9e9e !important}:global(.grey-text.text-base){color:#9e9e9e !important;caret-color:#9e9e9e !important}:global(.grey.lighten-5){background-color:#fafafa !important;border-color:#fafafa !important}:global(.grey-text.text-lighten-5){color:#fafafa !important;caret-color:#fafafa !important}:global(.grey.lighten-4){background-color:#f5f5f5 !important;border-color:#f5f5f5 !important}:global(.grey-text.text-lighten-4){color:#f5f5f5 !important;caret-color:#f5f5f5 !important}:global(.grey.lighten-3){background-color:#eee !important;border-color:#eee !important}:global(.grey-text.text-lighten-3){color:#eee !important;caret-color:#eee !important}:global(.grey.lighten-2){background-color:#e0e0e0 !important;border-color:#e0e0e0 !important}:global(.grey-text.text-lighten-2){color:#e0e0e0 !important;caret-color:#e0e0e0 !important}:global(.grey.lighten-1){background-color:#bdbdbd !important;border-color:#bdbdbd !important}:global(.grey-text.text-lighten-1){color:#bdbdbd !important;caret-color:#bdbdbd !important}:global(.grey.darken-1){background-color:#757575 !important;border-color:#757575 !important}:global(.grey-text.text-darken-1){color:#757575 !important;caret-color:#757575 !important}:global(.grey.darken-2){background-color:#616161 !important;border-color:#616161 !important}:global(.grey-text.text-darken-2){color:#616161 !important;caret-color:#616161 !important}:global(.grey.darken-3){background-color:#424242 !important;border-color:#424242 !important}:global(.grey-text.text-darken-3){color:#424242 !important;caret-color:#424242 !important}:global(.grey.darken-4){background-color:#212121 !important;border-color:#212121 !important}:global(.grey-text.text-darken-4){color:#212121 !important;caret-color:#212121 !important}:global(.black){background-color:#000 !important;border-color:#000 !important}:global(.black-text){color:#000 !important;caret-color:#000 !important}:global(.white){background-color:#fff !important;border-color:#fff !important}:global(.white-text){color:#fff !important;caret-color:#fff !important}:global(.transparent){background-color:transparent !important;border-color:transparent !important}:global(.transparent-text){color:transparent !important;caret-color:transparent !important}:global(.primary-color){background-color:#6200ee !important;border-color:#6200ee !important}:global(.primary-text){color:#6200ee !important;caret-color:#6200ee !important}:global(.secondary-color){background-color:#1976d2 !important;border-color:#1976d2 !important}:global(.secondary-text){color:#1976d2 !important;caret-color:#1976d2 !important}:global(.success-color){background-color:#4caf50 !important;border-color:#4caf50 !important}:global(.success-text){color:#4caf50 !important;caret-color:#4caf50 !important}:global(.info-color){background-color:#00bcd4 !important;border-color:#00bcd4 !important}:global(.info-text){color:#00bcd4 !important;caret-color:#00bcd4 !important}:global(.warning-color){background-color:#fb8c00 !important;border-color:#fb8c00 !important}:global(.warning-text){color:#fb8c00 !important;caret-color:#fb8c00 !important}:global(.error-color){background-color:#f44336 !important;border-color:#f44336 !important}:global(.error-text){color:#f44336 !important;caret-color:#f44336 !important}:global(.text-left){text-align:left}:global(.text-center){text-align:center}:global(.text-right){text-align:right}@media only screen and (min-width: 600px){:global(.text-sm-left){text-align:left}}@media only screen and (min-width: 960px){:global(.text-md-left){text-align:left}}@media only screen and (min-width: 1264px){:global(.text-lg-left){text-align:left}}@media only screen and (min-width: 1904px){:global(.text-xl-left){text-align:left}}@media only screen and (min-width: 600px){:global(.text-sm-center){text-align:center}}@media only screen and (min-width: 960px){:global(.text-md-center){text-align:center}}@media only screen and (min-width: 1264px){:global(.text-lg-center){text-align:center}}@media only screen and (min-width: 1904px){:global(.text-xl-center){text-align:center}}@media only screen and (min-width: 600px){:global(.text-sm-right){text-align:right}}@media only screen and (min-width: 960px){:global(.text-md-right){text-align:right}}@media only screen and (min-width: 1264px){:global(.text-lg-right){text-align:right}}@media only screen and (min-width: 1904px){:global(.text-xl-right){text-align:right}}:global(.text-decoration-none){text-decoration:none}:global(.text-decoration-overline){text-decoration:overline}:global(.text-decoration-underline){text-decoration:underline}:global(.text-decoration-line-through){text-decoration:line-through}:global(.text-lowercase){text-transform:lowercase}:global(.text-uppercase){text-transform:uppercase}:global(.text-capitalize){text-transform:capitalize}:global(.font-weight-thin){font-weight:100}:global(.font-weight-light){font-weight:300}:global(.font-weight-regular){font-weight:400}:global(.font-weight-medium){font-weight:500}:global(.font-weight-bold){font-weight:700}:global(.font-weight-black){font-weight:900}:global(.font-italic){font-style:italic}:global(.rounded-0){border-radius:0}:global(.rounded-tl-0){border-top-left-radius:0}:global(.rounded-tr-0){border-top-right-radius:0}:global(.rounded-bl-0){border-bottom-left-radius:0}:global(.rounded-br-0){border-bottom-right-radius:0}:global(.rounded-t-0){border-top-left-radius:0;border-top-right-radius:0}:global(.rounded-b-0){border-bottom-right-radius:0}:global(.rounded-b-0),:global(.rounded-l-0){border-bottom-left-radius:0}:global(.rounded-l-0){border-top-left-radius:0}:global(.rounded-r-0){border-top-right-radius:0;border-bottom-right-radius:0}:global(.rounded-sm){border-radius:2px}:global(.rounded-tl-sm){border-top-left-radius:2px}:global(.rounded-tr-sm){border-top-right-radius:2px}:global(.rounded-bl-sm){border-bottom-left-radius:2px}:global(.rounded-br-sm){border-bottom-right-radius:2px}:global(.rounded-t-sm){border-top-left-radius:2px;border-top-right-radius:2px}:global(.rounded-b-sm){border-bottom-right-radius:2px}:global(.rounded-b-sm),:global(.rounded-l-sm){border-bottom-left-radius:2px}:global(.rounded-l-sm){border-top-left-radius:2px}:global(.rounded-r-sm){border-top-right-radius:2px;border-bottom-right-radius:2px}:global(.rounded){border-radius:4px}:global(.rounded-tl){border-top-left-radius:4px}:global(.rounded-tr){border-top-right-radius:4px}:global(.rounded-bl){border-bottom-left-radius:4px}:global(.rounded-br){border-bottom-right-radius:4px}:global(.rounded-t){border-top-left-radius:4px;border-top-right-radius:4px}:global(.rounded-b){border-bottom-right-radius:4px}:global(.rounded-b),:global(.rounded-l){border-bottom-left-radius:4px}:global(.rounded-l){border-top-left-radius:4px}:global(.rounded-r){border-top-right-radius:4px;border-bottom-right-radius:4px}:global(.rounded-lg){border-radius:8px}:global(.rounded-tl-lg){border-top-left-radius:8px}:global(.rounded-tr-lg){border-top-right-radius:8px}:global(.rounded-bl-lg){border-bottom-left-radius:8px}:global(.rounded-br-lg){border-bottom-right-radius:8px}:global(.rounded-t-lg){border-top-left-radius:8px;border-top-right-radius:8px}:global(.rounded-b-lg){border-bottom-right-radius:8px}:global(.rounded-b-lg),:global(.rounded-l-lg){border-bottom-left-radius:8px}:global(.rounded-l-lg){border-top-left-radius:8px}:global(.rounded-r-lg){border-top-right-radius:8px;border-bottom-right-radius:8px}:global(.rounded-xl){border-radius:24px}:global(.rounded-tl-xl){border-top-left-radius:24px}:global(.rounded-tr-xl){border-top-right-radius:24px}:global(.rounded-bl-xl){border-bottom-left-radius:24px}:global(.rounded-br-xl){border-bottom-right-radius:24px}:global(.rounded-t-xl){border-top-left-radius:24px;border-top-right-radius:24px}:global(.rounded-b-xl){border-bottom-right-radius:24px}:global(.rounded-b-xl),:global(.rounded-l-xl){border-bottom-left-radius:24px}:global(.rounded-l-xl){border-top-left-radius:24px}:global(.rounded-r-xl){border-top-right-radius:24px;border-bottom-right-radius:24px}:global(.rounded-pill){border-radius:9999px}:global(.rounded-tl-pill){border-top-left-radius:9999px}:global(.rounded-tr-pill){border-top-right-radius:9999px}:global(.rounded-bl-pill){border-bottom-left-radius:9999px}:global(.rounded-br-pill){border-bottom-right-radius:9999px}:global(.rounded-t-pill){border-top-left-radius:9999px;border-top-right-radius:9999px}:global(.rounded-b-pill){border-bottom-right-radius:9999px}:global(.rounded-b-pill),:global(.rounded-l-pill){border-bottom-left-radius:9999px}:global(.rounded-l-pill){border-top-left-radius:9999px}:global(.rounded-r-pill){border-top-right-radius:9999px;border-bottom-right-radius:9999px}:global(.rounded-circle){border-radius:50%}:global(.rounded-tl-circle){border-top-left-radius:50%}:global(.rounded-tr-circle){border-top-right-radius:50%}:global(.rounded-bl-circle){border-bottom-left-radius:50%}:global(.rounded-br-circle){border-bottom-right-radius:50%}:global(.rounded-t-circle){border-top-left-radius:50%;border-top-right-radius:50%}:global(.rounded-b-circle){border-bottom-left-radius:50%;border-bottom-right-radius:50%}:global(.rounded-l-circle){border-top-left-radius:50%;border-bottom-left-radius:50%}:global(.rounded-r-circle){border-top-right-radius:50%;border-bottom-right-radius:50%}:global(.ma-0),:global(.ma-n0){margin:0 !important}:global(.ml-0),:global(.ml-n0){margin-left:0 !important}:global(.mr-0),:global(.mr-n0){margin-right:0 !important}:global(.mt-0),:global(.mt-n0){margin-top:0 !important}:global(.mb-0),:global(.mb-n0){margin-bottom:0 !important}:global(.pa-0),:global(.pa-n0){padding:0 !important}:global(.pl-0),:global(.pl-n0){padding-left:0 !important}:global(.pr-0),:global(.pr-n0){padding-right:0 !important}:global(.pt-0),:global(.pt-n0){padding-top:0 !important}:global(.pb-0),:global(.pb-n0){padding-bottom:0 !important}:global(.ma-1){margin:4px !important}:global(.ma-n1){margin:-4px !important}:global(.ml-1){margin-left:4px !important}:global(.ml-n1){margin-left:-4px !important}:global(.mr-1){margin-right:4px !important}:global(.mr-n1){margin-right:-4px !important}:global(.mt-1){margin-top:4px !important}:global(.mt-n1){margin-top:-4px !important}:global(.mb-1){margin-bottom:4px !important}:global(.mb-n1){margin-bottom:-4px !important}:global(.pa-1){padding:4px !important}:global(.pa-n1){padding:-4px !important}:global(.pl-1){padding-left:4px !important}:global(.pl-n1){padding-left:-4px !important}:global(.pr-1){padding-right:4px !important}:global(.pr-n1){padding-right:-4px !important}:global(.pt-1){padding-top:4px !important}:global(.pt-n1){padding-top:-4px !important}:global(.pb-1){padding-bottom:4px !important}:global(.pb-n1){padding-bottom:-4px !important}:global(.ma-2){margin:8px !important}:global(.ma-n2){margin:-8px !important}:global(.ml-2){margin-left:8px !important}:global(.ml-n2){margin-left:-8px !important}:global(.mr-2){margin-right:8px !important}:global(.mr-n2){margin-right:-8px !important}:global(.mt-2){margin-top:8px !important}:global(.mt-n2){margin-top:-8px !important}:global(.mb-2){margin-bottom:8px !important}:global(.mb-n2){margin-bottom:-8px !important}:global(.pa-2){padding:8px !important}:global(.pa-n2){padding:-8px !important}:global(.pl-2){padding-left:8px !important}:global(.pl-n2){padding-left:-8px !important}:global(.pr-2){padding-right:8px !important}:global(.pr-n2){padding-right:-8px !important}:global(.pt-2){padding-top:8px !important}:global(.pt-n2){padding-top:-8px !important}:global(.pb-2){padding-bottom:8px !important}:global(.pb-n2){padding-bottom:-8px !important}:global(.ma-3){margin:12px !important}:global(.ma-n3){margin:-12px !important}:global(.ml-3){margin-left:12px !important}:global(.ml-n3){margin-left:-12px !important}:global(.mr-3){margin-right:12px !important}:global(.mr-n3){margin-right:-12px !important}:global(.mt-3){margin-top:12px !important}:global(.mt-n3){margin-top:-12px !important}:global(.mb-3){margin-bottom:12px !important}:global(.mb-n3){margin-bottom:-12px !important}:global(.pa-3){padding:12px !important}:global(.pa-n3){padding:-12px !important}:global(.pl-3){padding-left:12px !important}:global(.pl-n3){padding-left:-12px !important}:global(.pr-3){padding-right:12px !important}:global(.pr-n3){padding-right:-12px !important}:global(.pt-3){padding-top:12px !important}:global(.pt-n3){padding-top:-12px !important}:global(.pb-3){padding-bottom:12px !important}:global(.pb-n3){padding-bottom:-12px !important}:global(.ma-4){margin:16px !important}:global(.ma-n4){margin:-16px !important}:global(.ml-4){margin-left:16px !important}:global(.ml-n4){margin-left:-16px !important}:global(.mr-4){margin-right:16px !important}:global(.mr-n4){margin-right:-16px !important}:global(.mt-4){margin-top:16px !important}:global(.mt-n4){margin-top:-16px !important}:global(.mb-4){margin-bottom:16px !important}:global(.mb-n4){margin-bottom:-16px !important}:global(.pa-4){padding:16px !important}:global(.pa-n4){padding:-16px !important}:global(.pl-4){padding-left:16px !important}:global(.pl-n4){padding-left:-16px !important}:global(.pr-4){padding-right:16px !important}:global(.pr-n4){padding-right:-16px !important}:global(.pt-4){padding-top:16px !important}:global(.pt-n4){padding-top:-16px !important}:global(.pb-4){padding-bottom:16px !important}:global(.pb-n4){padding-bottom:-16px !important}:global(.ma-5){margin:20px !important}:global(.ma-n5){margin:-20px !important}:global(.ml-5){margin-left:20px !important}:global(.ml-n5){margin-left:-20px !important}:global(.mr-5){margin-right:20px !important}:global(.mr-n5){margin-right:-20px !important}:global(.mt-5){margin-top:20px !important}:global(.mt-n5){margin-top:-20px !important}:global(.mb-5){margin-bottom:20px !important}:global(.mb-n5){margin-bottom:-20px !important}:global(.pa-5){padding:20px !important}:global(.pa-n5){padding:-20px !important}:global(.pl-5){padding-left:20px !important}:global(.pl-n5){padding-left:-20px !important}:global(.pr-5){padding-right:20px !important}:global(.pr-n5){padding-right:-20px !important}:global(.pt-5){padding-top:20px !important}:global(.pt-n5){padding-top:-20px !important}:global(.pb-5){padding-bottom:20px !important}:global(.pb-n5){padding-bottom:-20px !important}:global(.ma-6){margin:24px !important}:global(.ma-n6){margin:-24px !important}:global(.ml-6){margin-left:24px !important}:global(.ml-n6){margin-left:-24px !important}:global(.mr-6){margin-right:24px !important}:global(.mr-n6){margin-right:-24px !important}:global(.mt-6){margin-top:24px !important}:global(.mt-n6){margin-top:-24px !important}:global(.mb-6){margin-bottom:24px !important}:global(.mb-n6){margin-bottom:-24px !important}:global(.pa-6){padding:24px !important}:global(.pa-n6){padding:-24px !important}:global(.pl-6){padding-left:24px !important}:global(.pl-n6){padding-left:-24px !important}:global(.pr-6){padding-right:24px !important}:global(.pr-n6){padding-right:-24px !important}:global(.pt-6){padding-top:24px !important}:global(.pt-n6){padding-top:-24px !important}:global(.pb-6){padding-bottom:24px !important}:global(.pb-n6){padding-bottom:-24px !important}:global(.ma-7){margin:28px !important}:global(.ma-n7){margin:-28px !important}:global(.ml-7){margin-left:28px !important}:global(.ml-n7){margin-left:-28px !important}:global(.mr-7){margin-right:28px !important}:global(.mr-n7){margin-right:-28px !important}:global(.mt-7){margin-top:28px !important}:global(.mt-n7){margin-top:-28px !important}:global(.mb-7){margin-bottom:28px !important}:global(.mb-n7){margin-bottom:-28px !important}:global(.pa-7){padding:28px !important}:global(.pa-n7){padding:-28px !important}:global(.pl-7){padding-left:28px !important}:global(.pl-n7){padding-left:-28px !important}:global(.pr-7){padding-right:28px !important}:global(.pr-n7){padding-right:-28px !important}:global(.pt-7){padding-top:28px !important}:global(.pt-n7){padding-top:-28px !important}:global(.pb-7){padding-bottom:28px !important}:global(.pb-n7){padding-bottom:-28px !important}:global(.ma-8){margin:32px !important}:global(.ma-n8){margin:-32px !important}:global(.ml-8){margin-left:32px !important}:global(.ml-n8){margin-left:-32px !important}:global(.mr-8){margin-right:32px !important}:global(.mr-n8){margin-right:-32px !important}:global(.mt-8){margin-top:32px !important}:global(.mt-n8){margin-top:-32px !important}:global(.mb-8){margin-bottom:32px !important}:global(.mb-n8){margin-bottom:-32px !important}:global(.pa-8){padding:32px !important}:global(.pa-n8){padding:-32px !important}:global(.pl-8){padding-left:32px !important}:global(.pl-n8){padding-left:-32px !important}:global(.pr-8){padding-right:32px !important}:global(.pr-n8){padding-right:-32px !important}:global(.pt-8){padding-top:32px !important}:global(.pt-n8){padding-top:-32px !important}:global(.pb-8){padding-bottom:32px !important}:global(.pb-n8){padding-bottom:-32px !important}:global(.ma-9){margin:36px !important}:global(.ma-n9){margin:-36px !important}:global(.ml-9){margin-left:36px !important}:global(.ml-n9){margin-left:-36px !important}:global(.mr-9){margin-right:36px !important}:global(.mr-n9){margin-right:-36px !important}:global(.mt-9){margin-top:36px !important}:global(.mt-n9){margin-top:-36px !important}:global(.mb-9){margin-bottom:36px !important}:global(.mb-n9){margin-bottom:-36px !important}:global(.pa-9){padding:36px !important}:global(.pa-n9){padding:-36px !important}:global(.pl-9){padding-left:36px !important}:global(.pl-n9){padding-left:-36px !important}:global(.pr-9){padding-right:36px !important}:global(.pr-n9){padding-right:-36px !important}:global(.pt-9){padding-top:36px !important}:global(.pt-n9){padding-top:-36px !important}:global(.pb-9){padding-bottom:36px !important}:global(.pb-n9){padding-bottom:-36px !important}:global(.ma-10){margin:40px !important}:global(.ma-n10){margin:-40px !important}:global(.ml-10){margin-left:40px !important}:global(.ml-n10){margin-left:-40px !important}:global(.mr-10){margin-right:40px !important}:global(.mr-n10){margin-right:-40px !important}:global(.mt-10){margin-top:40px !important}:global(.mt-n10){margin-top:-40px !important}:global(.mb-10){margin-bottom:40px !important}:global(.mb-n10){margin-bottom:-40px !important}:global(.pa-10){padding:40px !important}:global(.pa-n10){padding:-40px !important}:global(.pl-10){padding-left:40px !important}:global(.pl-n10){padding-left:-40px !important}:global(.pr-10){padding-right:40px !important}:global(.pr-n10){padding-right:-40px !important}:global(.pt-10){padding-top:40px !important}:global(.pt-n10){padding-top:-40px !important}:global(.pb-10){padding-bottom:40px !important}:global(.pb-n10){padding-bottom:-40px !important}:global(.ma-11){margin:44px !important}:global(.ma-n11){margin:-44px !important}:global(.ml-11){margin-left:44px !important}:global(.ml-n11){margin-left:-44px !important}:global(.mr-11){margin-right:44px !important}:global(.mr-n11){margin-right:-44px !important}:global(.mt-11){margin-top:44px !important}:global(.mt-n11){margin-top:-44px !important}:global(.mb-11){margin-bottom:44px !important}:global(.mb-n11){margin-bottom:-44px !important}:global(.pa-11){padding:44px !important}:global(.pa-n11){padding:-44px !important}:global(.pl-11){padding-left:44px !important}:global(.pl-n11){padding-left:-44px !important}:global(.pr-11){padding-right:44px !important}:global(.pr-n11){padding-right:-44px !important}:global(.pt-11){padding-top:44px !important}:global(.pt-n11){padding-top:-44px !important}:global(.pb-11){padding-bottom:44px !important}:global(.pb-n11){padding-bottom:-44px !important}:global(.ma-12){margin:48px !important}:global(.ma-n12){margin:-48px !important}:global(.ml-12){margin-left:48px !important}:global(.ml-n12){margin-left:-48px !important}:global(.mr-12){margin-right:48px !important}:global(.mr-n12){margin-right:-48px !important}:global(.mt-12){margin-top:48px !important}:global(.mt-n12){margin-top:-48px !important}:global(.mb-12){margin-bottom:48px !important}:global(.mb-n12){margin-bottom:-48px !important}:global(.pa-12){padding:48px !important}:global(.pa-n12){padding:-48px !important}:global(.pl-12){padding-left:48px !important}:global(.pl-n12){padding-left:-48px !important}:global(.pr-12){padding-right:48px !important}:global(.pr-n12){padding-right:-48px !important}:global(.pt-12){padding-top:48px !important}:global(.pt-n12){padding-top:-48px !important}:global(.pb-12){padding-bottom:48px !important}:global(.pb-n12){padding-bottom:-48px !important}:global(.ma-13){margin:52px !important}:global(.ma-n13){margin:-52px !important}:global(.ml-13){margin-left:52px !important}:global(.ml-n13){margin-left:-52px !important}:global(.mr-13){margin-right:52px !important}:global(.mr-n13){margin-right:-52px !important}:global(.mt-13){margin-top:52px !important}:global(.mt-n13){margin-top:-52px !important}:global(.mb-13){margin-bottom:52px !important}:global(.mb-n13){margin-bottom:-52px !important}:global(.pa-13){padding:52px !important}:global(.pa-n13){padding:-52px !important}:global(.pl-13){padding-left:52px !important}:global(.pl-n13){padding-left:-52px !important}:global(.pr-13){padding-right:52px !important}:global(.pr-n13){padding-right:-52px !important}:global(.pt-13){padding-top:52px !important}:global(.pt-n13){padding-top:-52px !important}:global(.pb-13){padding-bottom:52px !important}:global(.pb-n13){padding-bottom:-52px !important}:global(.ma-14){margin:56px !important}:global(.ma-n14){margin:-56px !important}:global(.ml-14){margin-left:56px !important}:global(.ml-n14){margin-left:-56px !important}:global(.mr-14){margin-right:56px !important}:global(.mr-n14){margin-right:-56px !important}:global(.mt-14){margin-top:56px !important}:global(.mt-n14){margin-top:-56px !important}:global(.mb-14){margin-bottom:56px !important}:global(.mb-n14){margin-bottom:-56px !important}:global(.pa-14){padding:56px !important}:global(.pa-n14){padding:-56px !important}:global(.pl-14){padding-left:56px !important}:global(.pl-n14){padding-left:-56px !important}:global(.pr-14){padding-right:56px !important}:global(.pr-n14){padding-right:-56px !important}:global(.pt-14){padding-top:56px !important}:global(.pt-n14){padding-top:-56px !important}:global(.pb-14){padding-bottom:56px !important}:global(.pb-n14){padding-bottom:-56px !important}:global(.ma-15){margin:60px !important}:global(.ma-n15){margin:-60px !important}:global(.ml-15){margin-left:60px !important}:global(.ml-n15){margin-left:-60px !important}:global(.mr-15){margin-right:60px !important}:global(.mr-n15){margin-right:-60px !important}:global(.mt-15){margin-top:60px !important}:global(.mt-n15){margin-top:-60px !important}:global(.mb-15){margin-bottom:60px !important}:global(.mb-n15){margin-bottom:-60px !important}:global(.pa-15){padding:60px !important}:global(.pa-n15){padding:-60px !important}:global(.pl-15){padding-left:60px !important}:global(.pl-n15){padding-left:-60px !important}:global(.pr-15){padding-right:60px !important}:global(.pr-n15){padding-right:-60px !important}:global(.pt-15){padding-top:60px !important}:global(.pt-n15){padding-top:-60px !important}:global(.pb-15){padding-bottom:60px !important}:global(.pb-n15){padding-bottom:-60px !important}:global(.ma-16){margin:64px !important}:global(.ma-n16){margin:-64px !important}:global(.ml-16){margin-left:64px !important}:global(.ml-n16){margin-left:-64px !important}:global(.mr-16){margin-right:64px !important}:global(.mr-n16){margin-right:-64px !important}:global(.mt-16){margin-top:64px !important}:global(.mt-n16){margin-top:-64px !important}:global(.mb-16){margin-bottom:64px !important}:global(.mb-n16){margin-bottom:-64px !important}:global(.pa-16){padding:64px !important}:global(.pa-n16){padding:-64px !important}:global(.pl-16){padding-left:64px !important}:global(.pl-n16){padding-left:-64px !important}:global(.pr-16){padding-right:64px !important}:global(.pr-n16){padding-right:-64px !important}:global(.pt-16){padding-top:64px !important}:global(.pt-n16){padding-top:-64px !important}:global(.pb-16){padding-bottom:64px !important}:global(.pb-n16){padding-bottom:-64px !important}@media only screen and (min-width: 600px){:global(.ma-sm-0),:global(.ma-sm-n0){margin:0 !important}}@media only screen and (min-width: 960px){:global(.ma-md-0),:global(.ma-md-n0){margin:0 !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-0),:global(.ma-lg-n0){margin:0 !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-0),:global(.ma-xl-n0){margin:0 !important}}@media only screen and (min-width: 600px){:global(.ml-sm-0),:global(.ml-sm-n0){margin-left:0 !important}}@media only screen and (min-width: 960px){:global(.ml-md-0),:global(.ml-md-n0){margin-left:0 !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-0),:global(.ml-lg-n0){margin-left:0 !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-0),:global(.ml-xl-n0){margin-left:0 !important}}@media only screen and (min-width: 600px){:global(.mr-sm-0),:global(.mr-sm-n0){margin-right:0 !important}}@media only screen and (min-width: 960px){:global(.mr-md-0),:global(.mr-md-n0){margin-right:0 !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-0),:global(.mr-lg-n0){margin-right:0 !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-0),:global(.mr-xl-n0){margin-right:0 !important}}@media only screen and (min-width: 600px){:global(.mt-sm-0),:global(.mt-sm-n0){margin-top:0 !important}}@media only screen and (min-width: 960px){:global(.mt-md-0),:global(.mt-md-n0){margin-top:0 !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-0),:global(.mt-lg-n0){margin-top:0 !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-0),:global(.mt-xl-n0){margin-top:0 !important}}@media only screen and (min-width: 600px){:global(.mb-sm-0),:global(.mb-sm-n0){margin-bottom:0 !important}}@media only screen and (min-width: 960px){:global(.mb-md-0),:global(.mb-md-n0){margin-bottom:0 !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-0),:global(.mb-lg-n0){margin-bottom:0 !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-0),:global(.mb-xl-n0){margin-bottom:0 !important}}@media only screen and (min-width: 600px){:global(.pa-sm-0),:global(.pa-sm-n0){padding:0 !important}}@media only screen and (min-width: 960px){:global(.pa-md-0),:global(.pa-md-n0){padding:0 !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-0),:global(.pa-lg-n0){padding:0 !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-0),:global(.pa-xl-n0){padding:0 !important}}@media only screen and (min-width: 600px){:global(.pl-sm-0),:global(.pl-sm-n0){padding-left:0 !important}}@media only screen and (min-width: 960px){:global(.pl-md-0),:global(.pl-md-n0){padding-left:0 !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-0),:global(.pl-lg-n0){padding-left:0 !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-0),:global(.pl-xl-n0){padding-left:0 !important}}@media only screen and (min-width: 600px){:global(.pr-sm-0),:global(.pr-sm-n0){padding-right:0 !important}}@media only screen and (min-width: 960px){:global(.pr-md-0),:global(.pr-md-n0){padding-right:0 !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-0),:global(.pr-lg-n0){padding-right:0 !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-0),:global(.pr-xl-n0){padding-right:0 !important}}@media only screen and (min-width: 600px){:global(.pt-sm-0),:global(.pt-sm-n0){padding-top:0 !important}}@media only screen and (min-width: 960px){:global(.pt-md-0),:global(.pt-md-n0){padding-top:0 !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-0),:global(.pt-lg-n0){padding-top:0 !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-0),:global(.pt-xl-n0){padding-top:0 !important}}@media only screen and (min-width: 600px){:global(.pb-sm-0),:global(.pb-sm-n0){padding-bottom:0 !important}}@media only screen and (min-width: 960px){:global(.pb-md-0),:global(.pb-md-n0){padding-bottom:0 !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-0),:global(.pb-lg-n0){padding-bottom:0 !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-0),:global(.pb-xl-n0){padding-bottom:0 !important}}@media only screen and (min-width: 600px){:global(.ma-sm-1){margin:4px !important}:global(.ma-sm-n1){margin:-4px !important}}@media only screen and (min-width: 960px){:global(.ma-md-1){margin:4px !important}:global(.ma-md-n1){margin:-4px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-1){margin:4px !important}:global(.ma-lg-n1){margin:-4px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-1){margin:4px !important}:global(.ma-xl-n1){margin:-4px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-1){margin-left:4px !important}:global(.ml-sm-n1){margin-left:-4px !important}}@media only screen and (min-width: 960px){:global(.ml-md-1){margin-left:4px !important}:global(.ml-md-n1){margin-left:-4px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-1){margin-left:4px !important}:global(.ml-lg-n1){margin-left:-4px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-1){margin-left:4px !important}:global(.ml-xl-n1){margin-left:-4px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-1){margin-right:4px !important}:global(.mr-sm-n1){margin-right:-4px !important}}@media only screen and (min-width: 960px){:global(.mr-md-1){margin-right:4px !important}:global(.mr-md-n1){margin-right:-4px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-1){margin-right:4px !important}:global(.mr-lg-n1){margin-right:-4px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-1){margin-right:4px !important}:global(.mr-xl-n1){margin-right:-4px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-1){margin-top:4px !important}:global(.mt-sm-n1){margin-top:-4px !important}}@media only screen and (min-width: 960px){:global(.mt-md-1){margin-top:4px !important}:global(.mt-md-n1){margin-top:-4px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-1){margin-top:4px !important}:global(.mt-lg-n1){margin-top:-4px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-1){margin-top:4px !important}:global(.mt-xl-n1){margin-top:-4px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-1){margin-bottom:4px !important}:global(.mb-sm-n1){margin-bottom:-4px !important}}@media only screen and (min-width: 960px){:global(.mb-md-1){margin-bottom:4px !important}:global(.mb-md-n1){margin-bottom:-4px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-1){margin-bottom:4px !important}:global(.mb-lg-n1){margin-bottom:-4px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-1){margin-bottom:4px !important}:global(.mb-xl-n1){margin-bottom:-4px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-1){padding:4px !important}:global(.pa-sm-n1){padding:-4px !important}}@media only screen and (min-width: 960px){:global(.pa-md-1){padding:4px !important}:global(.pa-md-n1){padding:-4px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-1){padding:4px !important}:global(.pa-lg-n1){padding:-4px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-1){padding:4px !important}:global(.pa-xl-n1){padding:-4px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-1){padding-left:4px !important}:global(.pl-sm-n1){padding-left:-4px !important}}@media only screen and (min-width: 960px){:global(.pl-md-1){padding-left:4px !important}:global(.pl-md-n1){padding-left:-4px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-1){padding-left:4px !important}:global(.pl-lg-n1){padding-left:-4px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-1){padding-left:4px !important}:global(.pl-xl-n1){padding-left:-4px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-1){padding-right:4px !important}:global(.pr-sm-n1){padding-right:-4px !important}}@media only screen and (min-width: 960px){:global(.pr-md-1){padding-right:4px !important}:global(.pr-md-n1){padding-right:-4px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-1){padding-right:4px !important}:global(.pr-lg-n1){padding-right:-4px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-1){padding-right:4px !important}:global(.pr-xl-n1){padding-right:-4px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-1){padding-top:4px !important}:global(.pt-sm-n1){padding-top:-4px !important}}@media only screen and (min-width: 960px){:global(.pt-md-1){padding-top:4px !important}:global(.pt-md-n1){padding-top:-4px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-1){padding-top:4px !important}:global(.pt-lg-n1){padding-top:-4px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-1){padding-top:4px !important}:global(.pt-xl-n1){padding-top:-4px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-1){padding-bottom:4px !important}:global(.pb-sm-n1){padding-bottom:-4px !important}}@media only screen and (min-width: 960px){:global(.pb-md-1){padding-bottom:4px !important}:global(.pb-md-n1){padding-bottom:-4px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-1){padding-bottom:4px !important}:global(.pb-lg-n1){padding-bottom:-4px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-1){padding-bottom:4px !important}:global(.pb-xl-n1){padding-bottom:-4px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-2){margin:8px !important}:global(.ma-sm-n2){margin:-8px !important}}@media only screen and (min-width: 960px){:global(.ma-md-2){margin:8px !important}:global(.ma-md-n2){margin:-8px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-2){margin:8px !important}:global(.ma-lg-n2){margin:-8px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-2){margin:8px !important}:global(.ma-xl-n2){margin:-8px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-2){margin-left:8px !important}:global(.ml-sm-n2){margin-left:-8px !important}}@media only screen and (min-width: 960px){:global(.ml-md-2){margin-left:8px !important}:global(.ml-md-n2){margin-left:-8px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-2){margin-left:8px !important}:global(.ml-lg-n2){margin-left:-8px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-2){margin-left:8px !important}:global(.ml-xl-n2){margin-left:-8px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-2){margin-right:8px !important}:global(.mr-sm-n2){margin-right:-8px !important}}@media only screen and (min-width: 960px){:global(.mr-md-2){margin-right:8px !important}:global(.mr-md-n2){margin-right:-8px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-2){margin-right:8px !important}:global(.mr-lg-n2){margin-right:-8px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-2){margin-right:8px !important}:global(.mr-xl-n2){margin-right:-8px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-2){margin-top:8px !important}:global(.mt-sm-n2){margin-top:-8px !important}}@media only screen and (min-width: 960px){:global(.mt-md-2){margin-top:8px !important}:global(.mt-md-n2){margin-top:-8px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-2){margin-top:8px !important}:global(.mt-lg-n2){margin-top:-8px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-2){margin-top:8px !important}:global(.mt-xl-n2){margin-top:-8px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-2){margin-bottom:8px !important}:global(.mb-sm-n2){margin-bottom:-8px !important}}@media only screen and (min-width: 960px){:global(.mb-md-2){margin-bottom:8px !important}:global(.mb-md-n2){margin-bottom:-8px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-2){margin-bottom:8px !important}:global(.mb-lg-n2){margin-bottom:-8px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-2){margin-bottom:8px !important}:global(.mb-xl-n2){margin-bottom:-8px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-2){padding:8px !important}:global(.pa-sm-n2){padding:-8px !important}}@media only screen and (min-width: 960px){:global(.pa-md-2){padding:8px !important}:global(.pa-md-n2){padding:-8px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-2){padding:8px !important}:global(.pa-lg-n2){padding:-8px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-2){padding:8px !important}:global(.pa-xl-n2){padding:-8px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-2){padding-left:8px !important}:global(.pl-sm-n2){padding-left:-8px !important}}@media only screen and (min-width: 960px){:global(.pl-md-2){padding-left:8px !important}:global(.pl-md-n2){padding-left:-8px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-2){padding-left:8px !important}:global(.pl-lg-n2){padding-left:-8px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-2){padding-left:8px !important}:global(.pl-xl-n2){padding-left:-8px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-2){padding-right:8px !important}:global(.pr-sm-n2){padding-right:-8px !important}}@media only screen and (min-width: 960px){:global(.pr-md-2){padding-right:8px !important}:global(.pr-md-n2){padding-right:-8px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-2){padding-right:8px !important}:global(.pr-lg-n2){padding-right:-8px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-2){padding-right:8px !important}:global(.pr-xl-n2){padding-right:-8px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-2){padding-top:8px !important}:global(.pt-sm-n2){padding-top:-8px !important}}@media only screen and (min-width: 960px){:global(.pt-md-2){padding-top:8px !important}:global(.pt-md-n2){padding-top:-8px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-2){padding-top:8px !important}:global(.pt-lg-n2){padding-top:-8px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-2){padding-top:8px !important}:global(.pt-xl-n2){padding-top:-8px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-2){padding-bottom:8px !important}:global(.pb-sm-n2){padding-bottom:-8px !important}}@media only screen and (min-width: 960px){:global(.pb-md-2){padding-bottom:8px !important}:global(.pb-md-n2){padding-bottom:-8px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-2){padding-bottom:8px !important}:global(.pb-lg-n2){padding-bottom:-8px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-2){padding-bottom:8px !important}:global(.pb-xl-n2){padding-bottom:-8px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-3){margin:12px !important}:global(.ma-sm-n3){margin:-12px !important}}@media only screen and (min-width: 960px){:global(.ma-md-3){margin:12px !important}:global(.ma-md-n3){margin:-12px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-3){margin:12px !important}:global(.ma-lg-n3){margin:-12px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-3){margin:12px !important}:global(.ma-xl-n3){margin:-12px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-3){margin-left:12px !important}:global(.ml-sm-n3){margin-left:-12px !important}}@media only screen and (min-width: 960px){:global(.ml-md-3){margin-left:12px !important}:global(.ml-md-n3){margin-left:-12px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-3){margin-left:12px !important}:global(.ml-lg-n3){margin-left:-12px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-3){margin-left:12px !important}:global(.ml-xl-n3){margin-left:-12px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-3){margin-right:12px !important}:global(.mr-sm-n3){margin-right:-12px !important}}@media only screen and (min-width: 960px){:global(.mr-md-3){margin-right:12px !important}:global(.mr-md-n3){margin-right:-12px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-3){margin-right:12px !important}:global(.mr-lg-n3){margin-right:-12px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-3){margin-right:12px !important}:global(.mr-xl-n3){margin-right:-12px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-3){margin-top:12px !important}:global(.mt-sm-n3){margin-top:-12px !important}}@media only screen and (min-width: 960px){:global(.mt-md-3){margin-top:12px !important}:global(.mt-md-n3){margin-top:-12px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-3){margin-top:12px !important}:global(.mt-lg-n3){margin-top:-12px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-3){margin-top:12px !important}:global(.mt-xl-n3){margin-top:-12px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-3){margin-bottom:12px !important}:global(.mb-sm-n3){margin-bottom:-12px !important}}@media only screen and (min-width: 960px){:global(.mb-md-3){margin-bottom:12px !important}:global(.mb-md-n3){margin-bottom:-12px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-3){margin-bottom:12px !important}:global(.mb-lg-n3){margin-bottom:-12px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-3){margin-bottom:12px !important}:global(.mb-xl-n3){margin-bottom:-12px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-3){padding:12px !important}:global(.pa-sm-n3){padding:-12px !important}}@media only screen and (min-width: 960px){:global(.pa-md-3){padding:12px !important}:global(.pa-md-n3){padding:-12px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-3){padding:12px !important}:global(.pa-lg-n3){padding:-12px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-3){padding:12px !important}:global(.pa-xl-n3){padding:-12px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-3){padding-left:12px !important}:global(.pl-sm-n3){padding-left:-12px !important}}@media only screen and (min-width: 960px){:global(.pl-md-3){padding-left:12px !important}:global(.pl-md-n3){padding-left:-12px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-3){padding-left:12px !important}:global(.pl-lg-n3){padding-left:-12px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-3){padding-left:12px !important}:global(.pl-xl-n3){padding-left:-12px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-3){padding-right:12px !important}:global(.pr-sm-n3){padding-right:-12px !important}}@media only screen and (min-width: 960px){:global(.pr-md-3){padding-right:12px !important}:global(.pr-md-n3){padding-right:-12px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-3){padding-right:12px !important}:global(.pr-lg-n3){padding-right:-12px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-3){padding-right:12px !important}:global(.pr-xl-n3){padding-right:-12px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-3){padding-top:12px !important}:global(.pt-sm-n3){padding-top:-12px !important}}@media only screen and (min-width: 960px){:global(.pt-md-3){padding-top:12px !important}:global(.pt-md-n3){padding-top:-12px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-3){padding-top:12px !important}:global(.pt-lg-n3){padding-top:-12px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-3){padding-top:12px !important}:global(.pt-xl-n3){padding-top:-12px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-3){padding-bottom:12px !important}:global(.pb-sm-n3){padding-bottom:-12px !important}}@media only screen and (min-width: 960px){:global(.pb-md-3){padding-bottom:12px !important}:global(.pb-md-n3){padding-bottom:-12px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-3){padding-bottom:12px !important}:global(.pb-lg-n3){padding-bottom:-12px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-3){padding-bottom:12px !important}:global(.pb-xl-n3){padding-bottom:-12px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-4){margin:16px !important}:global(.ma-sm-n4){margin:-16px !important}}@media only screen and (min-width: 960px){:global(.ma-md-4){margin:16px !important}:global(.ma-md-n4){margin:-16px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-4){margin:16px !important}:global(.ma-lg-n4){margin:-16px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-4){margin:16px !important}:global(.ma-xl-n4){margin:-16px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-4){margin-left:16px !important}:global(.ml-sm-n4){margin-left:-16px !important}}@media only screen and (min-width: 960px){:global(.ml-md-4){margin-left:16px !important}:global(.ml-md-n4){margin-left:-16px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-4){margin-left:16px !important}:global(.ml-lg-n4){margin-left:-16px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-4){margin-left:16px !important}:global(.ml-xl-n4){margin-left:-16px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-4){margin-right:16px !important}:global(.mr-sm-n4){margin-right:-16px !important}}@media only screen and (min-width: 960px){:global(.mr-md-4){margin-right:16px !important}:global(.mr-md-n4){margin-right:-16px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-4){margin-right:16px !important}:global(.mr-lg-n4){margin-right:-16px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-4){margin-right:16px !important}:global(.mr-xl-n4){margin-right:-16px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-4){margin-top:16px !important}:global(.mt-sm-n4){margin-top:-16px !important}}@media only screen and (min-width: 960px){:global(.mt-md-4){margin-top:16px !important}:global(.mt-md-n4){margin-top:-16px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-4){margin-top:16px !important}:global(.mt-lg-n4){margin-top:-16px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-4){margin-top:16px !important}:global(.mt-xl-n4){margin-top:-16px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-4){margin-bottom:16px !important}:global(.mb-sm-n4){margin-bottom:-16px !important}}@media only screen and (min-width: 960px){:global(.mb-md-4){margin-bottom:16px !important}:global(.mb-md-n4){margin-bottom:-16px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-4){margin-bottom:16px !important}:global(.mb-lg-n4){margin-bottom:-16px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-4){margin-bottom:16px !important}:global(.mb-xl-n4){margin-bottom:-16px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-4){padding:16px !important}:global(.pa-sm-n4){padding:-16px !important}}@media only screen and (min-width: 960px){:global(.pa-md-4){padding:16px !important}:global(.pa-md-n4){padding:-16px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-4){padding:16px !important}:global(.pa-lg-n4){padding:-16px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-4){padding:16px !important}:global(.pa-xl-n4){padding:-16px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-4){padding-left:16px !important}:global(.pl-sm-n4){padding-left:-16px !important}}@media only screen and (min-width: 960px){:global(.pl-md-4){padding-left:16px !important}:global(.pl-md-n4){padding-left:-16px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-4){padding-left:16px !important}:global(.pl-lg-n4){padding-left:-16px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-4){padding-left:16px !important}:global(.pl-xl-n4){padding-left:-16px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-4){padding-right:16px !important}:global(.pr-sm-n4){padding-right:-16px !important}}@media only screen and (min-width: 960px){:global(.pr-md-4){padding-right:16px !important}:global(.pr-md-n4){padding-right:-16px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-4){padding-right:16px !important}:global(.pr-lg-n4){padding-right:-16px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-4){padding-right:16px !important}:global(.pr-xl-n4){padding-right:-16px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-4){padding-top:16px !important}:global(.pt-sm-n4){padding-top:-16px !important}}@media only screen and (min-width: 960px){:global(.pt-md-4){padding-top:16px !important}:global(.pt-md-n4){padding-top:-16px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-4){padding-top:16px !important}:global(.pt-lg-n4){padding-top:-16px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-4){padding-top:16px !important}:global(.pt-xl-n4){padding-top:-16px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-4){padding-bottom:16px !important}:global(.pb-sm-n4){padding-bottom:-16px !important}}@media only screen and (min-width: 960px){:global(.pb-md-4){padding-bottom:16px !important}:global(.pb-md-n4){padding-bottom:-16px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-4){padding-bottom:16px !important}:global(.pb-lg-n4){padding-bottom:-16px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-4){padding-bottom:16px !important}:global(.pb-xl-n4){padding-bottom:-16px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-5){margin:20px !important}:global(.ma-sm-n5){margin:-20px !important}}@media only screen and (min-width: 960px){:global(.ma-md-5){margin:20px !important}:global(.ma-md-n5){margin:-20px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-5){margin:20px !important}:global(.ma-lg-n5){margin:-20px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-5){margin:20px !important}:global(.ma-xl-n5){margin:-20px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-5){margin-left:20px !important}:global(.ml-sm-n5){margin-left:-20px !important}}@media only screen and (min-width: 960px){:global(.ml-md-5){margin-left:20px !important}:global(.ml-md-n5){margin-left:-20px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-5){margin-left:20px !important}:global(.ml-lg-n5){margin-left:-20px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-5){margin-left:20px !important}:global(.ml-xl-n5){margin-left:-20px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-5){margin-right:20px !important}:global(.mr-sm-n5){margin-right:-20px !important}}@media only screen and (min-width: 960px){:global(.mr-md-5){margin-right:20px !important}:global(.mr-md-n5){margin-right:-20px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-5){margin-right:20px !important}:global(.mr-lg-n5){margin-right:-20px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-5){margin-right:20px !important}:global(.mr-xl-n5){margin-right:-20px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-5){margin-top:20px !important}:global(.mt-sm-n5){margin-top:-20px !important}}@media only screen and (min-width: 960px){:global(.mt-md-5){margin-top:20px !important}:global(.mt-md-n5){margin-top:-20px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-5){margin-top:20px !important}:global(.mt-lg-n5){margin-top:-20px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-5){margin-top:20px !important}:global(.mt-xl-n5){margin-top:-20px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-5){margin-bottom:20px !important}:global(.mb-sm-n5){margin-bottom:-20px !important}}@media only screen and (min-width: 960px){:global(.mb-md-5){margin-bottom:20px !important}:global(.mb-md-n5){margin-bottom:-20px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-5){margin-bottom:20px !important}:global(.mb-lg-n5){margin-bottom:-20px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-5){margin-bottom:20px !important}:global(.mb-xl-n5){margin-bottom:-20px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-5){padding:20px !important}:global(.pa-sm-n5){padding:-20px !important}}@media only screen and (min-width: 960px){:global(.pa-md-5){padding:20px !important}:global(.pa-md-n5){padding:-20px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-5){padding:20px !important}:global(.pa-lg-n5){padding:-20px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-5){padding:20px !important}:global(.pa-xl-n5){padding:-20px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-5){padding-left:20px !important}:global(.pl-sm-n5){padding-left:-20px !important}}@media only screen and (min-width: 960px){:global(.pl-md-5){padding-left:20px !important}:global(.pl-md-n5){padding-left:-20px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-5){padding-left:20px !important}:global(.pl-lg-n5){padding-left:-20px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-5){padding-left:20px !important}:global(.pl-xl-n5){padding-left:-20px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-5){padding-right:20px !important}:global(.pr-sm-n5){padding-right:-20px !important}}@media only screen and (min-width: 960px){:global(.pr-md-5){padding-right:20px !important}:global(.pr-md-n5){padding-right:-20px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-5){padding-right:20px !important}:global(.pr-lg-n5){padding-right:-20px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-5){padding-right:20px !important}:global(.pr-xl-n5){padding-right:-20px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-5){padding-top:20px !important}:global(.pt-sm-n5){padding-top:-20px !important}}@media only screen and (min-width: 960px){:global(.pt-md-5){padding-top:20px !important}:global(.pt-md-n5){padding-top:-20px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-5){padding-top:20px !important}:global(.pt-lg-n5){padding-top:-20px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-5){padding-top:20px !important}:global(.pt-xl-n5){padding-top:-20px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-5){padding-bottom:20px !important}:global(.pb-sm-n5){padding-bottom:-20px !important}}@media only screen and (min-width: 960px){:global(.pb-md-5){padding-bottom:20px !important}:global(.pb-md-n5){padding-bottom:-20px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-5){padding-bottom:20px !important}:global(.pb-lg-n5){padding-bottom:-20px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-5){padding-bottom:20px !important}:global(.pb-xl-n5){padding-bottom:-20px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-6){margin:24px !important}:global(.ma-sm-n6){margin:-24px !important}}@media only screen and (min-width: 960px){:global(.ma-md-6){margin:24px !important}:global(.ma-md-n6){margin:-24px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-6){margin:24px !important}:global(.ma-lg-n6){margin:-24px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-6){margin:24px !important}:global(.ma-xl-n6){margin:-24px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-6){margin-left:24px !important}:global(.ml-sm-n6){margin-left:-24px !important}}@media only screen and (min-width: 960px){:global(.ml-md-6){margin-left:24px !important}:global(.ml-md-n6){margin-left:-24px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-6){margin-left:24px !important}:global(.ml-lg-n6){margin-left:-24px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-6){margin-left:24px !important}:global(.ml-xl-n6){margin-left:-24px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-6){margin-right:24px !important}:global(.mr-sm-n6){margin-right:-24px !important}}@media only screen and (min-width: 960px){:global(.mr-md-6){margin-right:24px !important}:global(.mr-md-n6){margin-right:-24px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-6){margin-right:24px !important}:global(.mr-lg-n6){margin-right:-24px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-6){margin-right:24px !important}:global(.mr-xl-n6){margin-right:-24px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-6){margin-top:24px !important}:global(.mt-sm-n6){margin-top:-24px !important}}@media only screen and (min-width: 960px){:global(.mt-md-6){margin-top:24px !important}:global(.mt-md-n6){margin-top:-24px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-6){margin-top:24px !important}:global(.mt-lg-n6){margin-top:-24px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-6){margin-top:24px !important}:global(.mt-xl-n6){margin-top:-24px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-6){margin-bottom:24px !important}:global(.mb-sm-n6){margin-bottom:-24px !important}}@media only screen and (min-width: 960px){:global(.mb-md-6){margin-bottom:24px !important}:global(.mb-md-n6){margin-bottom:-24px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-6){margin-bottom:24px !important}:global(.mb-lg-n6){margin-bottom:-24px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-6){margin-bottom:24px !important}:global(.mb-xl-n6){margin-bottom:-24px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-6){padding:24px !important}:global(.pa-sm-n6){padding:-24px !important}}@media only screen and (min-width: 960px){:global(.pa-md-6){padding:24px !important}:global(.pa-md-n6){padding:-24px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-6){padding:24px !important}:global(.pa-lg-n6){padding:-24px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-6){padding:24px !important}:global(.pa-xl-n6){padding:-24px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-6){padding-left:24px !important}:global(.pl-sm-n6){padding-left:-24px !important}}@media only screen and (min-width: 960px){:global(.pl-md-6){padding-left:24px !important}:global(.pl-md-n6){padding-left:-24px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-6){padding-left:24px !important}:global(.pl-lg-n6){padding-left:-24px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-6){padding-left:24px !important}:global(.pl-xl-n6){padding-left:-24px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-6){padding-right:24px !important}:global(.pr-sm-n6){padding-right:-24px !important}}@media only screen and (min-width: 960px){:global(.pr-md-6){padding-right:24px !important}:global(.pr-md-n6){padding-right:-24px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-6){padding-right:24px !important}:global(.pr-lg-n6){padding-right:-24px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-6){padding-right:24px !important}:global(.pr-xl-n6){padding-right:-24px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-6){padding-top:24px !important}:global(.pt-sm-n6){padding-top:-24px !important}}@media only screen and (min-width: 960px){:global(.pt-md-6){padding-top:24px !important}:global(.pt-md-n6){padding-top:-24px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-6){padding-top:24px !important}:global(.pt-lg-n6){padding-top:-24px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-6){padding-top:24px !important}:global(.pt-xl-n6){padding-top:-24px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-6){padding-bottom:24px !important}:global(.pb-sm-n6){padding-bottom:-24px !important}}@media only screen and (min-width: 960px){:global(.pb-md-6){padding-bottom:24px !important}:global(.pb-md-n6){padding-bottom:-24px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-6){padding-bottom:24px !important}:global(.pb-lg-n6){padding-bottom:-24px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-6){padding-bottom:24px !important}:global(.pb-xl-n6){padding-bottom:-24px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-7){margin:28px !important}:global(.ma-sm-n7){margin:-28px !important}}@media only screen and (min-width: 960px){:global(.ma-md-7){margin:28px !important}:global(.ma-md-n7){margin:-28px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-7){margin:28px !important}:global(.ma-lg-n7){margin:-28px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-7){margin:28px !important}:global(.ma-xl-n7){margin:-28px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-7){margin-left:28px !important}:global(.ml-sm-n7){margin-left:-28px !important}}@media only screen and (min-width: 960px){:global(.ml-md-7){margin-left:28px !important}:global(.ml-md-n7){margin-left:-28px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-7){margin-left:28px !important}:global(.ml-lg-n7){margin-left:-28px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-7){margin-left:28px !important}:global(.ml-xl-n7){margin-left:-28px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-7){margin-right:28px !important}:global(.mr-sm-n7){margin-right:-28px !important}}@media only screen and (min-width: 960px){:global(.mr-md-7){margin-right:28px !important}:global(.mr-md-n7){margin-right:-28px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-7){margin-right:28px !important}:global(.mr-lg-n7){margin-right:-28px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-7){margin-right:28px !important}:global(.mr-xl-n7){margin-right:-28px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-7){margin-top:28px !important}:global(.mt-sm-n7){margin-top:-28px !important}}@media only screen and (min-width: 960px){:global(.mt-md-7){margin-top:28px !important}:global(.mt-md-n7){margin-top:-28px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-7){margin-top:28px !important}:global(.mt-lg-n7){margin-top:-28px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-7){margin-top:28px !important}:global(.mt-xl-n7){margin-top:-28px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-7){margin-bottom:28px !important}:global(.mb-sm-n7){margin-bottom:-28px !important}}@media only screen and (min-width: 960px){:global(.mb-md-7){margin-bottom:28px !important}:global(.mb-md-n7){margin-bottom:-28px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-7){margin-bottom:28px !important}:global(.mb-lg-n7){margin-bottom:-28px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-7){margin-bottom:28px !important}:global(.mb-xl-n7){margin-bottom:-28px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-7){padding:28px !important}:global(.pa-sm-n7){padding:-28px !important}}@media only screen and (min-width: 960px){:global(.pa-md-7){padding:28px !important}:global(.pa-md-n7){padding:-28px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-7){padding:28px !important}:global(.pa-lg-n7){padding:-28px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-7){padding:28px !important}:global(.pa-xl-n7){padding:-28px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-7){padding-left:28px !important}:global(.pl-sm-n7){padding-left:-28px !important}}@media only screen and (min-width: 960px){:global(.pl-md-7){padding-left:28px !important}:global(.pl-md-n7){padding-left:-28px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-7){padding-left:28px !important}:global(.pl-lg-n7){padding-left:-28px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-7){padding-left:28px !important}:global(.pl-xl-n7){padding-left:-28px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-7){padding-right:28px !important}:global(.pr-sm-n7){padding-right:-28px !important}}@media only screen and (min-width: 960px){:global(.pr-md-7){padding-right:28px !important}:global(.pr-md-n7){padding-right:-28px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-7){padding-right:28px !important}:global(.pr-lg-n7){padding-right:-28px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-7){padding-right:28px !important}:global(.pr-xl-n7){padding-right:-28px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-7){padding-top:28px !important}:global(.pt-sm-n7){padding-top:-28px !important}}@media only screen and (min-width: 960px){:global(.pt-md-7){padding-top:28px !important}:global(.pt-md-n7){padding-top:-28px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-7){padding-top:28px !important}:global(.pt-lg-n7){padding-top:-28px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-7){padding-top:28px !important}:global(.pt-xl-n7){padding-top:-28px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-7){padding-bottom:28px !important}:global(.pb-sm-n7){padding-bottom:-28px !important}}@media only screen and (min-width: 960px){:global(.pb-md-7){padding-bottom:28px !important}:global(.pb-md-n7){padding-bottom:-28px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-7){padding-bottom:28px !important}:global(.pb-lg-n7){padding-bottom:-28px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-7){padding-bottom:28px !important}:global(.pb-xl-n7){padding-bottom:-28px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-8){margin:32px !important}:global(.ma-sm-n8){margin:-32px !important}}@media only screen and (min-width: 960px){:global(.ma-md-8){margin:32px !important}:global(.ma-md-n8){margin:-32px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-8){margin:32px !important}:global(.ma-lg-n8){margin:-32px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-8){margin:32px !important}:global(.ma-xl-n8){margin:-32px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-8){margin-left:32px !important}:global(.ml-sm-n8){margin-left:-32px !important}}@media only screen and (min-width: 960px){:global(.ml-md-8){margin-left:32px !important}:global(.ml-md-n8){margin-left:-32px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-8){margin-left:32px !important}:global(.ml-lg-n8){margin-left:-32px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-8){margin-left:32px !important}:global(.ml-xl-n8){margin-left:-32px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-8){margin-right:32px !important}:global(.mr-sm-n8){margin-right:-32px !important}}@media only screen and (min-width: 960px){:global(.mr-md-8){margin-right:32px !important}:global(.mr-md-n8){margin-right:-32px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-8){margin-right:32px !important}:global(.mr-lg-n8){margin-right:-32px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-8){margin-right:32px !important}:global(.mr-xl-n8){margin-right:-32px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-8){margin-top:32px !important}:global(.mt-sm-n8){margin-top:-32px !important}}@media only screen and (min-width: 960px){:global(.mt-md-8){margin-top:32px !important}:global(.mt-md-n8){margin-top:-32px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-8){margin-top:32px !important}:global(.mt-lg-n8){margin-top:-32px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-8){margin-top:32px !important}:global(.mt-xl-n8){margin-top:-32px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-8){margin-bottom:32px !important}:global(.mb-sm-n8){margin-bottom:-32px !important}}@media only screen and (min-width: 960px){:global(.mb-md-8){margin-bottom:32px !important}:global(.mb-md-n8){margin-bottom:-32px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-8){margin-bottom:32px !important}:global(.mb-lg-n8){margin-bottom:-32px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-8){margin-bottom:32px !important}:global(.mb-xl-n8){margin-bottom:-32px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-8){padding:32px !important}:global(.pa-sm-n8){padding:-32px !important}}@media only screen and (min-width: 960px){:global(.pa-md-8){padding:32px !important}:global(.pa-md-n8){padding:-32px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-8){padding:32px !important}:global(.pa-lg-n8){padding:-32px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-8){padding:32px !important}:global(.pa-xl-n8){padding:-32px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-8){padding-left:32px !important}:global(.pl-sm-n8){padding-left:-32px !important}}@media only screen and (min-width: 960px){:global(.pl-md-8){padding-left:32px !important}:global(.pl-md-n8){padding-left:-32px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-8){padding-left:32px !important}:global(.pl-lg-n8){padding-left:-32px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-8){padding-left:32px !important}:global(.pl-xl-n8){padding-left:-32px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-8){padding-right:32px !important}:global(.pr-sm-n8){padding-right:-32px !important}}@media only screen and (min-width: 960px){:global(.pr-md-8){padding-right:32px !important}:global(.pr-md-n8){padding-right:-32px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-8){padding-right:32px !important}:global(.pr-lg-n8){padding-right:-32px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-8){padding-right:32px !important}:global(.pr-xl-n8){padding-right:-32px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-8){padding-top:32px !important}:global(.pt-sm-n8){padding-top:-32px !important}}@media only screen and (min-width: 960px){:global(.pt-md-8){padding-top:32px !important}:global(.pt-md-n8){padding-top:-32px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-8){padding-top:32px !important}:global(.pt-lg-n8){padding-top:-32px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-8){padding-top:32px !important}:global(.pt-xl-n8){padding-top:-32px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-8){padding-bottom:32px !important}:global(.pb-sm-n8){padding-bottom:-32px !important}}@media only screen and (min-width: 960px){:global(.pb-md-8){padding-bottom:32px !important}:global(.pb-md-n8){padding-bottom:-32px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-8){padding-bottom:32px !important}:global(.pb-lg-n8){padding-bottom:-32px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-8){padding-bottom:32px !important}:global(.pb-xl-n8){padding-bottom:-32px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-9){margin:36px !important}:global(.ma-sm-n9){margin:-36px !important}}@media only screen and (min-width: 960px){:global(.ma-md-9){margin:36px !important}:global(.ma-md-n9){margin:-36px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-9){margin:36px !important}:global(.ma-lg-n9){margin:-36px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-9){margin:36px !important}:global(.ma-xl-n9){margin:-36px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-9){margin-left:36px !important}:global(.ml-sm-n9){margin-left:-36px !important}}@media only screen and (min-width: 960px){:global(.ml-md-9){margin-left:36px !important}:global(.ml-md-n9){margin-left:-36px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-9){margin-left:36px !important}:global(.ml-lg-n9){margin-left:-36px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-9){margin-left:36px !important}:global(.ml-xl-n9){margin-left:-36px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-9){margin-right:36px !important}:global(.mr-sm-n9){margin-right:-36px !important}}@media only screen and (min-width: 960px){:global(.mr-md-9){margin-right:36px !important}:global(.mr-md-n9){margin-right:-36px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-9){margin-right:36px !important}:global(.mr-lg-n9){margin-right:-36px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-9){margin-right:36px !important}:global(.mr-xl-n9){margin-right:-36px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-9){margin-top:36px !important}:global(.mt-sm-n9){margin-top:-36px !important}}@media only screen and (min-width: 960px){:global(.mt-md-9){margin-top:36px !important}:global(.mt-md-n9){margin-top:-36px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-9){margin-top:36px !important}:global(.mt-lg-n9){margin-top:-36px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-9){margin-top:36px !important}:global(.mt-xl-n9){margin-top:-36px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-9){margin-bottom:36px !important}:global(.mb-sm-n9){margin-bottom:-36px !important}}@media only screen and (min-width: 960px){:global(.mb-md-9){margin-bottom:36px !important}:global(.mb-md-n9){margin-bottom:-36px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-9){margin-bottom:36px !important}:global(.mb-lg-n9){margin-bottom:-36px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-9){margin-bottom:36px !important}:global(.mb-xl-n9){margin-bottom:-36px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-9){padding:36px !important}:global(.pa-sm-n9){padding:-36px !important}}@media only screen and (min-width: 960px){:global(.pa-md-9){padding:36px !important}:global(.pa-md-n9){padding:-36px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-9){padding:36px !important}:global(.pa-lg-n9){padding:-36px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-9){padding:36px !important}:global(.pa-xl-n9){padding:-36px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-9){padding-left:36px !important}:global(.pl-sm-n9){padding-left:-36px !important}}@media only screen and (min-width: 960px){:global(.pl-md-9){padding-left:36px !important}:global(.pl-md-n9){padding-left:-36px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-9){padding-left:36px !important}:global(.pl-lg-n9){padding-left:-36px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-9){padding-left:36px !important}:global(.pl-xl-n9){padding-left:-36px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-9){padding-right:36px !important}:global(.pr-sm-n9){padding-right:-36px !important}}@media only screen and (min-width: 960px){:global(.pr-md-9){padding-right:36px !important}:global(.pr-md-n9){padding-right:-36px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-9){padding-right:36px !important}:global(.pr-lg-n9){padding-right:-36px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-9){padding-right:36px !important}:global(.pr-xl-n9){padding-right:-36px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-9){padding-top:36px !important}:global(.pt-sm-n9){padding-top:-36px !important}}@media only screen and (min-width: 960px){:global(.pt-md-9){padding-top:36px !important}:global(.pt-md-n9){padding-top:-36px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-9){padding-top:36px !important}:global(.pt-lg-n9){padding-top:-36px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-9){padding-top:36px !important}:global(.pt-xl-n9){padding-top:-36px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-9){padding-bottom:36px !important}:global(.pb-sm-n9){padding-bottom:-36px !important}}@media only screen and (min-width: 960px){:global(.pb-md-9){padding-bottom:36px !important}:global(.pb-md-n9){padding-bottom:-36px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-9){padding-bottom:36px !important}:global(.pb-lg-n9){padding-bottom:-36px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-9){padding-bottom:36px !important}:global(.pb-xl-n9){padding-bottom:-36px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-10){margin:40px !important}:global(.ma-sm-n10){margin:-40px !important}}@media only screen and (min-width: 960px){:global(.ma-md-10){margin:40px !important}:global(.ma-md-n10){margin:-40px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-10){margin:40px !important}:global(.ma-lg-n10){margin:-40px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-10){margin:40px !important}:global(.ma-xl-n10){margin:-40px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-10){margin-left:40px !important}:global(.ml-sm-n10){margin-left:-40px !important}}@media only screen and (min-width: 960px){:global(.ml-md-10){margin-left:40px !important}:global(.ml-md-n10){margin-left:-40px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-10){margin-left:40px !important}:global(.ml-lg-n10){margin-left:-40px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-10){margin-left:40px !important}:global(.ml-xl-n10){margin-left:-40px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-10){margin-right:40px !important}:global(.mr-sm-n10){margin-right:-40px !important}}@media only screen and (min-width: 960px){:global(.mr-md-10){margin-right:40px !important}:global(.mr-md-n10){margin-right:-40px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-10){margin-right:40px !important}:global(.mr-lg-n10){margin-right:-40px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-10){margin-right:40px !important}:global(.mr-xl-n10){margin-right:-40px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-10){margin-top:40px !important}:global(.mt-sm-n10){margin-top:-40px !important}}@media only screen and (min-width: 960px){:global(.mt-md-10){margin-top:40px !important}:global(.mt-md-n10){margin-top:-40px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-10){margin-top:40px !important}:global(.mt-lg-n10){margin-top:-40px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-10){margin-top:40px !important}:global(.mt-xl-n10){margin-top:-40px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-10){margin-bottom:40px !important}:global(.mb-sm-n10){margin-bottom:-40px !important}}@media only screen and (min-width: 960px){:global(.mb-md-10){margin-bottom:40px !important}:global(.mb-md-n10){margin-bottom:-40px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-10){margin-bottom:40px !important}:global(.mb-lg-n10){margin-bottom:-40px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-10){margin-bottom:40px !important}:global(.mb-xl-n10){margin-bottom:-40px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-10){padding:40px !important}:global(.pa-sm-n10){padding:-40px !important}}@media only screen and (min-width: 960px){:global(.pa-md-10){padding:40px !important}:global(.pa-md-n10){padding:-40px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-10){padding:40px !important}:global(.pa-lg-n10){padding:-40px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-10){padding:40px !important}:global(.pa-xl-n10){padding:-40px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-10){padding-left:40px !important}:global(.pl-sm-n10){padding-left:-40px !important}}@media only screen and (min-width: 960px){:global(.pl-md-10){padding-left:40px !important}:global(.pl-md-n10){padding-left:-40px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-10){padding-left:40px !important}:global(.pl-lg-n10){padding-left:-40px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-10){padding-left:40px !important}:global(.pl-xl-n10){padding-left:-40px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-10){padding-right:40px !important}:global(.pr-sm-n10){padding-right:-40px !important}}@media only screen and (min-width: 960px){:global(.pr-md-10){padding-right:40px !important}:global(.pr-md-n10){padding-right:-40px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-10){padding-right:40px !important}:global(.pr-lg-n10){padding-right:-40px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-10){padding-right:40px !important}:global(.pr-xl-n10){padding-right:-40px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-10){padding-top:40px !important}:global(.pt-sm-n10){padding-top:-40px !important}}@media only screen and (min-width: 960px){:global(.pt-md-10){padding-top:40px !important}:global(.pt-md-n10){padding-top:-40px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-10){padding-top:40px !important}:global(.pt-lg-n10){padding-top:-40px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-10){padding-top:40px !important}:global(.pt-xl-n10){padding-top:-40px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-10){padding-bottom:40px !important}:global(.pb-sm-n10){padding-bottom:-40px !important}}@media only screen and (min-width: 960px){:global(.pb-md-10){padding-bottom:40px !important}:global(.pb-md-n10){padding-bottom:-40px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-10){padding-bottom:40px !important}:global(.pb-lg-n10){padding-bottom:-40px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-10){padding-bottom:40px !important}:global(.pb-xl-n10){padding-bottom:-40px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-11){margin:44px !important}:global(.ma-sm-n11){margin:-44px !important}}@media only screen and (min-width: 960px){:global(.ma-md-11){margin:44px !important}:global(.ma-md-n11){margin:-44px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-11){margin:44px !important}:global(.ma-lg-n11){margin:-44px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-11){margin:44px !important}:global(.ma-xl-n11){margin:-44px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-11){margin-left:44px !important}:global(.ml-sm-n11){margin-left:-44px !important}}@media only screen and (min-width: 960px){:global(.ml-md-11){margin-left:44px !important}:global(.ml-md-n11){margin-left:-44px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-11){margin-left:44px !important}:global(.ml-lg-n11){margin-left:-44px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-11){margin-left:44px !important}:global(.ml-xl-n11){margin-left:-44px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-11){margin-right:44px !important}:global(.mr-sm-n11){margin-right:-44px !important}}@media only screen and (min-width: 960px){:global(.mr-md-11){margin-right:44px !important}:global(.mr-md-n11){margin-right:-44px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-11){margin-right:44px !important}:global(.mr-lg-n11){margin-right:-44px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-11){margin-right:44px !important}:global(.mr-xl-n11){margin-right:-44px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-11){margin-top:44px !important}:global(.mt-sm-n11){margin-top:-44px !important}}@media only screen and (min-width: 960px){:global(.mt-md-11){margin-top:44px !important}:global(.mt-md-n11){margin-top:-44px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-11){margin-top:44px !important}:global(.mt-lg-n11){margin-top:-44px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-11){margin-top:44px !important}:global(.mt-xl-n11){margin-top:-44px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-11){margin-bottom:44px !important}:global(.mb-sm-n11){margin-bottom:-44px !important}}@media only screen and (min-width: 960px){:global(.mb-md-11){margin-bottom:44px !important}:global(.mb-md-n11){margin-bottom:-44px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-11){margin-bottom:44px !important}:global(.mb-lg-n11){margin-bottom:-44px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-11){margin-bottom:44px !important}:global(.mb-xl-n11){margin-bottom:-44px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-11){padding:44px !important}:global(.pa-sm-n11){padding:-44px !important}}@media only screen and (min-width: 960px){:global(.pa-md-11){padding:44px !important}:global(.pa-md-n11){padding:-44px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-11){padding:44px !important}:global(.pa-lg-n11){padding:-44px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-11){padding:44px !important}:global(.pa-xl-n11){padding:-44px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-11){padding-left:44px !important}:global(.pl-sm-n11){padding-left:-44px !important}}@media only screen and (min-width: 960px){:global(.pl-md-11){padding-left:44px !important}:global(.pl-md-n11){padding-left:-44px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-11){padding-left:44px !important}:global(.pl-lg-n11){padding-left:-44px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-11){padding-left:44px !important}:global(.pl-xl-n11){padding-left:-44px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-11){padding-right:44px !important}:global(.pr-sm-n11){padding-right:-44px !important}}@media only screen and (min-width: 960px){:global(.pr-md-11){padding-right:44px !important}:global(.pr-md-n11){padding-right:-44px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-11){padding-right:44px !important}:global(.pr-lg-n11){padding-right:-44px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-11){padding-right:44px !important}:global(.pr-xl-n11){padding-right:-44px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-11){padding-top:44px !important}:global(.pt-sm-n11){padding-top:-44px !important}}@media only screen and (min-width: 960px){:global(.pt-md-11){padding-top:44px !important}:global(.pt-md-n11){padding-top:-44px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-11){padding-top:44px !important}:global(.pt-lg-n11){padding-top:-44px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-11){padding-top:44px !important}:global(.pt-xl-n11){padding-top:-44px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-11){padding-bottom:44px !important}:global(.pb-sm-n11){padding-bottom:-44px !important}}@media only screen and (min-width: 960px){:global(.pb-md-11){padding-bottom:44px !important}:global(.pb-md-n11){padding-bottom:-44px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-11){padding-bottom:44px !important}:global(.pb-lg-n11){padding-bottom:-44px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-11){padding-bottom:44px !important}:global(.pb-xl-n11){padding-bottom:-44px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-12){margin:48px !important}:global(.ma-sm-n12){margin:-48px !important}}@media only screen and (min-width: 960px){:global(.ma-md-12){margin:48px !important}:global(.ma-md-n12){margin:-48px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-12){margin:48px !important}:global(.ma-lg-n12){margin:-48px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-12){margin:48px !important}:global(.ma-xl-n12){margin:-48px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-12){margin-left:48px !important}:global(.ml-sm-n12){margin-left:-48px !important}}@media only screen and (min-width: 960px){:global(.ml-md-12){margin-left:48px !important}:global(.ml-md-n12){margin-left:-48px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-12){margin-left:48px !important}:global(.ml-lg-n12){margin-left:-48px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-12){margin-left:48px !important}:global(.ml-xl-n12){margin-left:-48px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-12){margin-right:48px !important}:global(.mr-sm-n12){margin-right:-48px !important}}@media only screen and (min-width: 960px){:global(.mr-md-12){margin-right:48px !important}:global(.mr-md-n12){margin-right:-48px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-12){margin-right:48px !important}:global(.mr-lg-n12){margin-right:-48px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-12){margin-right:48px !important}:global(.mr-xl-n12){margin-right:-48px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-12){margin-top:48px !important}:global(.mt-sm-n12){margin-top:-48px !important}}@media only screen and (min-width: 960px){:global(.mt-md-12){margin-top:48px !important}:global(.mt-md-n12){margin-top:-48px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-12){margin-top:48px !important}:global(.mt-lg-n12){margin-top:-48px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-12){margin-top:48px !important}:global(.mt-xl-n12){margin-top:-48px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-12){margin-bottom:48px !important}:global(.mb-sm-n12){margin-bottom:-48px !important}}@media only screen and (min-width: 960px){:global(.mb-md-12){margin-bottom:48px !important}:global(.mb-md-n12){margin-bottom:-48px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-12){margin-bottom:48px !important}:global(.mb-lg-n12){margin-bottom:-48px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-12){margin-bottom:48px !important}:global(.mb-xl-n12){margin-bottom:-48px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-12){padding:48px !important}:global(.pa-sm-n12){padding:-48px !important}}@media only screen and (min-width: 960px){:global(.pa-md-12){padding:48px !important}:global(.pa-md-n12){padding:-48px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-12){padding:48px !important}:global(.pa-lg-n12){padding:-48px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-12){padding:48px !important}:global(.pa-xl-n12){padding:-48px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-12){padding-left:48px !important}:global(.pl-sm-n12){padding-left:-48px !important}}@media only screen and (min-width: 960px){:global(.pl-md-12){padding-left:48px !important}:global(.pl-md-n12){padding-left:-48px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-12){padding-left:48px !important}:global(.pl-lg-n12){padding-left:-48px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-12){padding-left:48px !important}:global(.pl-xl-n12){padding-left:-48px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-12){padding-right:48px !important}:global(.pr-sm-n12){padding-right:-48px !important}}@media only screen and (min-width: 960px){:global(.pr-md-12){padding-right:48px !important}:global(.pr-md-n12){padding-right:-48px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-12){padding-right:48px !important}:global(.pr-lg-n12){padding-right:-48px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-12){padding-right:48px !important}:global(.pr-xl-n12){padding-right:-48px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-12){padding-top:48px !important}:global(.pt-sm-n12){padding-top:-48px !important}}@media only screen and (min-width: 960px){:global(.pt-md-12){padding-top:48px !important}:global(.pt-md-n12){padding-top:-48px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-12){padding-top:48px !important}:global(.pt-lg-n12){padding-top:-48px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-12){padding-top:48px !important}:global(.pt-xl-n12){padding-top:-48px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-12){padding-bottom:48px !important}:global(.pb-sm-n12){padding-bottom:-48px !important}}@media only screen and (min-width: 960px){:global(.pb-md-12){padding-bottom:48px !important}:global(.pb-md-n12){padding-bottom:-48px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-12){padding-bottom:48px !important}:global(.pb-lg-n12){padding-bottom:-48px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-12){padding-bottom:48px !important}:global(.pb-xl-n12){padding-bottom:-48px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-13){margin:52px !important}:global(.ma-sm-n13){margin:-52px !important}}@media only screen and (min-width: 960px){:global(.ma-md-13){margin:52px !important}:global(.ma-md-n13){margin:-52px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-13){margin:52px !important}:global(.ma-lg-n13){margin:-52px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-13){margin:52px !important}:global(.ma-xl-n13){margin:-52px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-13){margin-left:52px !important}:global(.ml-sm-n13){margin-left:-52px !important}}@media only screen and (min-width: 960px){:global(.ml-md-13){margin-left:52px !important}:global(.ml-md-n13){margin-left:-52px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-13){margin-left:52px !important}:global(.ml-lg-n13){margin-left:-52px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-13){margin-left:52px !important}:global(.ml-xl-n13){margin-left:-52px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-13){margin-right:52px !important}:global(.mr-sm-n13){margin-right:-52px !important}}@media only screen and (min-width: 960px){:global(.mr-md-13){margin-right:52px !important}:global(.mr-md-n13){margin-right:-52px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-13){margin-right:52px !important}:global(.mr-lg-n13){margin-right:-52px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-13){margin-right:52px !important}:global(.mr-xl-n13){margin-right:-52px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-13){margin-top:52px !important}:global(.mt-sm-n13){margin-top:-52px !important}}@media only screen and (min-width: 960px){:global(.mt-md-13){margin-top:52px !important}:global(.mt-md-n13){margin-top:-52px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-13){margin-top:52px !important}:global(.mt-lg-n13){margin-top:-52px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-13){margin-top:52px !important}:global(.mt-xl-n13){margin-top:-52px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-13){margin-bottom:52px !important}:global(.mb-sm-n13){margin-bottom:-52px !important}}@media only screen and (min-width: 960px){:global(.mb-md-13){margin-bottom:52px !important}:global(.mb-md-n13){margin-bottom:-52px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-13){margin-bottom:52px !important}:global(.mb-lg-n13){margin-bottom:-52px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-13){margin-bottom:52px !important}:global(.mb-xl-n13){margin-bottom:-52px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-13){padding:52px !important}:global(.pa-sm-n13){padding:-52px !important}}@media only screen and (min-width: 960px){:global(.pa-md-13){padding:52px !important}:global(.pa-md-n13){padding:-52px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-13){padding:52px !important}:global(.pa-lg-n13){padding:-52px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-13){padding:52px !important}:global(.pa-xl-n13){padding:-52px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-13){padding-left:52px !important}:global(.pl-sm-n13){padding-left:-52px !important}}@media only screen and (min-width: 960px){:global(.pl-md-13){padding-left:52px !important}:global(.pl-md-n13){padding-left:-52px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-13){padding-left:52px !important}:global(.pl-lg-n13){padding-left:-52px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-13){padding-left:52px !important}:global(.pl-xl-n13){padding-left:-52px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-13){padding-right:52px !important}:global(.pr-sm-n13){padding-right:-52px !important}}@media only screen and (min-width: 960px){:global(.pr-md-13){padding-right:52px !important}:global(.pr-md-n13){padding-right:-52px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-13){padding-right:52px !important}:global(.pr-lg-n13){padding-right:-52px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-13){padding-right:52px !important}:global(.pr-xl-n13){padding-right:-52px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-13){padding-top:52px !important}:global(.pt-sm-n13){padding-top:-52px !important}}@media only screen and (min-width: 960px){:global(.pt-md-13){padding-top:52px !important}:global(.pt-md-n13){padding-top:-52px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-13){padding-top:52px !important}:global(.pt-lg-n13){padding-top:-52px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-13){padding-top:52px !important}:global(.pt-xl-n13){padding-top:-52px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-13){padding-bottom:52px !important}:global(.pb-sm-n13){padding-bottom:-52px !important}}@media only screen and (min-width: 960px){:global(.pb-md-13){padding-bottom:52px !important}:global(.pb-md-n13){padding-bottom:-52px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-13){padding-bottom:52px !important}:global(.pb-lg-n13){padding-bottom:-52px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-13){padding-bottom:52px !important}:global(.pb-xl-n13){padding-bottom:-52px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-14){margin:56px !important}:global(.ma-sm-n14){margin:-56px !important}}@media only screen and (min-width: 960px){:global(.ma-md-14){margin:56px !important}:global(.ma-md-n14){margin:-56px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-14){margin:56px !important}:global(.ma-lg-n14){margin:-56px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-14){margin:56px !important}:global(.ma-xl-n14){margin:-56px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-14){margin-left:56px !important}:global(.ml-sm-n14){margin-left:-56px !important}}@media only screen and (min-width: 960px){:global(.ml-md-14){margin-left:56px !important}:global(.ml-md-n14){margin-left:-56px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-14){margin-left:56px !important}:global(.ml-lg-n14){margin-left:-56px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-14){margin-left:56px !important}:global(.ml-xl-n14){margin-left:-56px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-14){margin-right:56px !important}:global(.mr-sm-n14){margin-right:-56px !important}}@media only screen and (min-width: 960px){:global(.mr-md-14){margin-right:56px !important}:global(.mr-md-n14){margin-right:-56px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-14){margin-right:56px !important}:global(.mr-lg-n14){margin-right:-56px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-14){margin-right:56px !important}:global(.mr-xl-n14){margin-right:-56px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-14){margin-top:56px !important}:global(.mt-sm-n14){margin-top:-56px !important}}@media only screen and (min-width: 960px){:global(.mt-md-14){margin-top:56px !important}:global(.mt-md-n14){margin-top:-56px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-14){margin-top:56px !important}:global(.mt-lg-n14){margin-top:-56px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-14){margin-top:56px !important}:global(.mt-xl-n14){margin-top:-56px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-14){margin-bottom:56px !important}:global(.mb-sm-n14){margin-bottom:-56px !important}}@media only screen and (min-width: 960px){:global(.mb-md-14){margin-bottom:56px !important}:global(.mb-md-n14){margin-bottom:-56px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-14){margin-bottom:56px !important}:global(.mb-lg-n14){margin-bottom:-56px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-14){margin-bottom:56px !important}:global(.mb-xl-n14){margin-bottom:-56px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-14){padding:56px !important}:global(.pa-sm-n14){padding:-56px !important}}@media only screen and (min-width: 960px){:global(.pa-md-14){padding:56px !important}:global(.pa-md-n14){padding:-56px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-14){padding:56px !important}:global(.pa-lg-n14){padding:-56px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-14){padding:56px !important}:global(.pa-xl-n14){padding:-56px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-14){padding-left:56px !important}:global(.pl-sm-n14){padding-left:-56px !important}}@media only screen and (min-width: 960px){:global(.pl-md-14){padding-left:56px !important}:global(.pl-md-n14){padding-left:-56px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-14){padding-left:56px !important}:global(.pl-lg-n14){padding-left:-56px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-14){padding-left:56px !important}:global(.pl-xl-n14){padding-left:-56px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-14){padding-right:56px !important}:global(.pr-sm-n14){padding-right:-56px !important}}@media only screen and (min-width: 960px){:global(.pr-md-14){padding-right:56px !important}:global(.pr-md-n14){padding-right:-56px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-14){padding-right:56px !important}:global(.pr-lg-n14){padding-right:-56px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-14){padding-right:56px !important}:global(.pr-xl-n14){padding-right:-56px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-14){padding-top:56px !important}:global(.pt-sm-n14){padding-top:-56px !important}}@media only screen and (min-width: 960px){:global(.pt-md-14){padding-top:56px !important}:global(.pt-md-n14){padding-top:-56px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-14){padding-top:56px !important}:global(.pt-lg-n14){padding-top:-56px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-14){padding-top:56px !important}:global(.pt-xl-n14){padding-top:-56px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-14){padding-bottom:56px !important}:global(.pb-sm-n14){padding-bottom:-56px !important}}@media only screen and (min-width: 960px){:global(.pb-md-14){padding-bottom:56px !important}:global(.pb-md-n14){padding-bottom:-56px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-14){padding-bottom:56px !important}:global(.pb-lg-n14){padding-bottom:-56px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-14){padding-bottom:56px !important}:global(.pb-xl-n14){padding-bottom:-56px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-15){margin:60px !important}:global(.ma-sm-n15){margin:-60px !important}}@media only screen and (min-width: 960px){:global(.ma-md-15){margin:60px !important}:global(.ma-md-n15){margin:-60px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-15){margin:60px !important}:global(.ma-lg-n15){margin:-60px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-15){margin:60px !important}:global(.ma-xl-n15){margin:-60px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-15){margin-left:60px !important}:global(.ml-sm-n15){margin-left:-60px !important}}@media only screen and (min-width: 960px){:global(.ml-md-15){margin-left:60px !important}:global(.ml-md-n15){margin-left:-60px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-15){margin-left:60px !important}:global(.ml-lg-n15){margin-left:-60px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-15){margin-left:60px !important}:global(.ml-xl-n15){margin-left:-60px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-15){margin-right:60px !important}:global(.mr-sm-n15){margin-right:-60px !important}}@media only screen and (min-width: 960px){:global(.mr-md-15){margin-right:60px !important}:global(.mr-md-n15){margin-right:-60px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-15){margin-right:60px !important}:global(.mr-lg-n15){margin-right:-60px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-15){margin-right:60px !important}:global(.mr-xl-n15){margin-right:-60px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-15){margin-top:60px !important}:global(.mt-sm-n15){margin-top:-60px !important}}@media only screen and (min-width: 960px){:global(.mt-md-15){margin-top:60px !important}:global(.mt-md-n15){margin-top:-60px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-15){margin-top:60px !important}:global(.mt-lg-n15){margin-top:-60px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-15){margin-top:60px !important}:global(.mt-xl-n15){margin-top:-60px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-15){margin-bottom:60px !important}:global(.mb-sm-n15){margin-bottom:-60px !important}}@media only screen and (min-width: 960px){:global(.mb-md-15){margin-bottom:60px !important}:global(.mb-md-n15){margin-bottom:-60px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-15){margin-bottom:60px !important}:global(.mb-lg-n15){margin-bottom:-60px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-15){margin-bottom:60px !important}:global(.mb-xl-n15){margin-bottom:-60px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-15){padding:60px !important}:global(.pa-sm-n15){padding:-60px !important}}@media only screen and (min-width: 960px){:global(.pa-md-15){padding:60px !important}:global(.pa-md-n15){padding:-60px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-15){padding:60px !important}:global(.pa-lg-n15){padding:-60px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-15){padding:60px !important}:global(.pa-xl-n15){padding:-60px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-15){padding-left:60px !important}:global(.pl-sm-n15){padding-left:-60px !important}}@media only screen and (min-width: 960px){:global(.pl-md-15){padding-left:60px !important}:global(.pl-md-n15){padding-left:-60px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-15){padding-left:60px !important}:global(.pl-lg-n15){padding-left:-60px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-15){padding-left:60px !important}:global(.pl-xl-n15){padding-left:-60px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-15){padding-right:60px !important}:global(.pr-sm-n15){padding-right:-60px !important}}@media only screen and (min-width: 960px){:global(.pr-md-15){padding-right:60px !important}:global(.pr-md-n15){padding-right:-60px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-15){padding-right:60px !important}:global(.pr-lg-n15){padding-right:-60px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-15){padding-right:60px !important}:global(.pr-xl-n15){padding-right:-60px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-15){padding-top:60px !important}:global(.pt-sm-n15){padding-top:-60px !important}}@media only screen and (min-width: 960px){:global(.pt-md-15){padding-top:60px !important}:global(.pt-md-n15){padding-top:-60px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-15){padding-top:60px !important}:global(.pt-lg-n15){padding-top:-60px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-15){padding-top:60px !important}:global(.pt-xl-n15){padding-top:-60px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-15){padding-bottom:60px !important}:global(.pb-sm-n15){padding-bottom:-60px !important}}@media only screen and (min-width: 960px){:global(.pb-md-15){padding-bottom:60px !important}:global(.pb-md-n15){padding-bottom:-60px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-15){padding-bottom:60px !important}:global(.pb-lg-n15){padding-bottom:-60px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-15){padding-bottom:60px !important}:global(.pb-xl-n15){padding-bottom:-60px !important}}@media only screen and (min-width: 600px){:global(.ma-sm-16){margin:64px !important}:global(.ma-sm-n16){margin:-64px !important}}@media only screen and (min-width: 960px){:global(.ma-md-16){margin:64px !important}:global(.ma-md-n16){margin:-64px !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-16){margin:64px !important}:global(.ma-lg-n16){margin:-64px !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-16){margin:64px !important}:global(.ma-xl-n16){margin:-64px !important}}@media only screen and (min-width: 600px){:global(.ml-sm-16){margin-left:64px !important}:global(.ml-sm-n16){margin-left:-64px !important}}@media only screen and (min-width: 960px){:global(.ml-md-16){margin-left:64px !important}:global(.ml-md-n16){margin-left:-64px !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-16){margin-left:64px !important}:global(.ml-lg-n16){margin-left:-64px !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-16){margin-left:64px !important}:global(.ml-xl-n16){margin-left:-64px !important}}@media only screen and (min-width: 600px){:global(.mr-sm-16){margin-right:64px !important}:global(.mr-sm-n16){margin-right:-64px !important}}@media only screen and (min-width: 960px){:global(.mr-md-16){margin-right:64px !important}:global(.mr-md-n16){margin-right:-64px !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-16){margin-right:64px !important}:global(.mr-lg-n16){margin-right:-64px !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-16){margin-right:64px !important}:global(.mr-xl-n16){margin-right:-64px !important}}@media only screen and (min-width: 600px){:global(.mt-sm-16){margin-top:64px !important}:global(.mt-sm-n16){margin-top:-64px !important}}@media only screen and (min-width: 960px){:global(.mt-md-16){margin-top:64px !important}:global(.mt-md-n16){margin-top:-64px !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-16){margin-top:64px !important}:global(.mt-lg-n16){margin-top:-64px !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-16){margin-top:64px !important}:global(.mt-xl-n16){margin-top:-64px !important}}@media only screen and (min-width: 600px){:global(.mb-sm-16){margin-bottom:64px !important}:global(.mb-sm-n16){margin-bottom:-64px !important}}@media only screen and (min-width: 960px){:global(.mb-md-16){margin-bottom:64px !important}:global(.mb-md-n16){margin-bottom:-64px !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-16){margin-bottom:64px !important}:global(.mb-lg-n16){margin-bottom:-64px !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-16){margin-bottom:64px !important}:global(.mb-xl-n16){margin-bottom:-64px !important}}@media only screen and (min-width: 600px){:global(.pa-sm-16){padding:64px !important}:global(.pa-sm-n16){padding:-64px !important}}@media only screen and (min-width: 960px){:global(.pa-md-16){padding:64px !important}:global(.pa-md-n16){padding:-64px !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-16){padding:64px !important}:global(.pa-lg-n16){padding:-64px !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-16){padding:64px !important}:global(.pa-xl-n16){padding:-64px !important}}@media only screen and (min-width: 600px){:global(.pl-sm-16){padding-left:64px !important}:global(.pl-sm-n16){padding-left:-64px !important}}@media only screen and (min-width: 960px){:global(.pl-md-16){padding-left:64px !important}:global(.pl-md-n16){padding-left:-64px !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-16){padding-left:64px !important}:global(.pl-lg-n16){padding-left:-64px !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-16){padding-left:64px !important}:global(.pl-xl-n16){padding-left:-64px !important}}@media only screen and (min-width: 600px){:global(.pr-sm-16){padding-right:64px !important}:global(.pr-sm-n16){padding-right:-64px !important}}@media only screen and (min-width: 960px){:global(.pr-md-16){padding-right:64px !important}:global(.pr-md-n16){padding-right:-64px !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-16){padding-right:64px !important}:global(.pr-lg-n16){padding-right:-64px !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-16){padding-right:64px !important}:global(.pr-xl-n16){padding-right:-64px !important}}@media only screen and (min-width: 600px){:global(.pt-sm-16){padding-top:64px !important}:global(.pt-sm-n16){padding-top:-64px !important}}@media only screen and (min-width: 960px){:global(.pt-md-16){padding-top:64px !important}:global(.pt-md-n16){padding-top:-64px !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-16){padding-top:64px !important}:global(.pt-lg-n16){padding-top:-64px !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-16){padding-top:64px !important}:global(.pt-xl-n16){padding-top:-64px !important}}@media only screen and (min-width: 600px){:global(.pb-sm-16){padding-bottom:64px !important}:global(.pb-sm-n16){padding-bottom:-64px !important}}@media only screen and (min-width: 960px){:global(.pb-md-16){padding-bottom:64px !important}:global(.pb-md-n16){padding-bottom:-64px !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-16){padding-bottom:64px !important}:global(.pb-lg-n16){padding-bottom:-64px !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-16){padding-bottom:64px !important}:global(.pb-xl-n16){padding-bottom:-64px !important}}:global(.ma-auto){margin:auto !important}:global(.ml-auto){margin-left:auto !important}:global(.mr-auto){margin-right:auto !important}:global(.mt-auto){margin-top:auto !important}:global(.mb-auto){margin-bottom:auto !important}:global(.pa-auto){padding:auto !important}:global(.pl-auto){padding-left:auto !important}:global(.pr-auto){padding-right:auto !important}:global(.pt-auto){padding-top:auto !important}:global(.pb-auto){padding-bottom:auto !important}@media only screen and (min-width: 600px){:global(.ma-sm-auto){margin:auto !important}}@media only screen and (min-width: 960px){:global(.ma-md-auto){margin:auto !important}}@media only screen and (min-width: 1264px){:global(.ma-lg-auto){margin:auto !important}}@media only screen and (min-width: 1904px){:global(.ma-xl-auto){margin:auto !important}}@media only screen and (min-width: 600px){:global(.ml-sm-auto){margin-left:auto !important}}@media only screen and (min-width: 960px){:global(.ml-md-auto){margin-left:auto !important}}@media only screen and (min-width: 1264px){:global(.ml-lg-auto){margin-left:auto !important}}@media only screen and (min-width: 1904px){:global(.ml-xl-auto){margin-left:auto !important}}@media only screen and (min-width: 600px){:global(.mr-sm-auto){margin-right:auto !important}}@media only screen and (min-width: 960px){:global(.mr-md-auto){margin-right:auto !important}}@media only screen and (min-width: 1264px){:global(.mr-lg-auto){margin-right:auto !important}}@media only screen and (min-width: 1904px){:global(.mr-xl-auto){margin-right:auto !important}}@media only screen and (min-width: 600px){:global(.mt-sm-auto){margin-top:auto !important}}@media only screen and (min-width: 960px){:global(.mt-md-auto){margin-top:auto !important}}@media only screen and (min-width: 1264px){:global(.mt-lg-auto){margin-top:auto !important}}@media only screen and (min-width: 1904px){:global(.mt-xl-auto){margin-top:auto !important}}@media only screen and (min-width: 600px){:global(.mb-sm-auto){margin-bottom:auto !important}}@media only screen and (min-width: 960px){:global(.mb-md-auto){margin-bottom:auto !important}}@media only screen and (min-width: 1264px){:global(.mb-lg-auto){margin-bottom:auto !important}}@media only screen and (min-width: 1904px){:global(.mb-xl-auto){margin-bottom:auto !important}}@media only screen and (min-width: 600px){:global(.pa-sm-auto){padding:auto !important}}@media only screen and (min-width: 960px){:global(.pa-md-auto){padding:auto !important}}@media only screen and (min-width: 1264px){:global(.pa-lg-auto){padding:auto !important}}@media only screen and (min-width: 1904px){:global(.pa-xl-auto){padding:auto !important}}@media only screen and (min-width: 600px){:global(.pl-sm-auto){padding-left:auto !important}}@media only screen and (min-width: 960px){:global(.pl-md-auto){padding-left:auto !important}}@media only screen and (min-width: 1264px){:global(.pl-lg-auto){padding-left:auto !important}}@media only screen and (min-width: 1904px){:global(.pl-xl-auto){padding-left:auto !important}}@media only screen and (min-width: 600px){:global(.pr-sm-auto){padding-right:auto !important}}@media only screen and (min-width: 960px){:global(.pr-md-auto){padding-right:auto !important}}@media only screen and (min-width: 1264px){:global(.pr-lg-auto){padding-right:auto !important}}@media only screen and (min-width: 1904px){:global(.pr-xl-auto){padding-right:auto !important}}@media only screen and (min-width: 600px){:global(.pt-sm-auto){padding-top:auto !important}}@media only screen and (min-width: 960px){:global(.pt-md-auto){padding-top:auto !important}}@media only screen and (min-width: 1264px){:global(.pt-lg-auto){padding-top:auto !important}}@media only screen and (min-width: 1904px){:global(.pt-xl-auto){padding-top:auto !important}}@media only screen and (min-width: 600px){:global(.pb-sm-auto){padding-bottom:auto !important}}@media only screen and (min-width: 960px){:global(.pb-md-auto){padding-bottom:auto !important}}@media only screen and (min-width: 1264px){:global(.pb-lg-auto){padding-bottom:auto !important}}@media only screen and (min-width: 1904px){:global(.pb-xl-auto){padding-bottom:auto !important}}:global(.d-none){display:none}:global(.d-inline){display:inline}:global(.d-inline-block){display:inline-block}:global(.d-block){display:block}:global(.d-flex){display:flex}:global(.d-inline-flex){display:inline-flex}@media only screen and (min-width: 600px){:global(.d-sm-none){display:none}}@media only screen and (min-width: 960px){:global(.d-md-none){display:none}}@media only screen and (min-width: 1264px){:global(.d-lg-none){display:none}}@media only screen and (min-width: 1904px){:global(.d-xl-none){display:none}}@media only screen and (min-width: 600px){:global(.d-sm-inline){display:inline}}@media only screen and (min-width: 960px){:global(.d-md-inline){display:inline}}@media only screen and (min-width: 1264px){:global(.d-lg-inline){display:inline}}@media only screen and (min-width: 1904px){:global(.d-xl-inline){display:inline}}@media only screen and (min-width: 600px){:global(.d-sm-inline-block){display:inline-block}}@media only screen and (min-width: 960px){:global(.d-md-inline-block){display:inline-block}}@media only screen and (min-width: 1264px){:global(.d-lg-inline-block){display:inline-block}}@media only screen and (min-width: 1904px){:global(.d-xl-inline-block){display:inline-block}}@media only screen and (min-width: 600px){:global(.d-sm-block){display:block}}@media only screen and (min-width: 960px){:global(.d-md-block){display:block}}@media only screen and (min-width: 1264px){:global(.d-lg-block){display:block}}@media only screen and (min-width: 1904px){:global(.d-xl-block){display:block}}@media only screen and (min-width: 600px){:global(.d-sm-flex){display:flex}}@media only screen and (min-width: 960px){:global(.d-md-flex){display:flex}}@media only screen and (min-width: 1264px){:global(.d-lg-flex){display:flex}}@media only screen and (min-width: 1904px){:global(.d-xl-flex){display:flex}}@media only screen and (min-width: 600px){:global(.d-sm-inline-flex){display:inline-flex}}@media only screen and (min-width: 960px){:global(.d-md-inline-flex){display:inline-flex}}@media only screen and (min-width: 1264px){:global(.d-lg-inline-flex){display:inline-flex}}@media only screen and (min-width: 1904px){:global(.d-xl-inline-flex){display:inline-flex}}:global(.flex-row){flex-direction:row}:global(.flex-row-reverse){flex-direction:row-reverse}:global(.flex-column){flex-direction:column}:global(.flex-column-reverse){flex-direction:column-reverse}@media only screen and (min-width: 600px){:global(.flex-sm-row){flex-direction:row}:global(.flex-sm-row-reverse){flex-direction:row-reverse}:global(.flex-sm-column){flex-direction:column}:global(.flex-sm-column-reverse){flex-direction:column-reverse}}@media only screen and (min-width: 960px){:global(.flex-md-row){flex-direction:row}:global(.flex-md-row-reverse){flex-direction:row-reverse}:global(.flex-md-column){flex-direction:column}:global(.flex-md-column-reverse){flex-direction:column-reverse}}@media only screen and (min-width: 1264px){:global(.flex-lg-row){flex-direction:row}:global(.flex-lg-row-reverse){flex-direction:row-reverse}:global(.flex-lg-column){flex-direction:column}:global(.flex-lg-column-reverse){flex-direction:column-reverse}}@media only screen and (min-width: 1904px){:global(.flex-xl-row){flex-direction:row}:global(.flex-xl-row-reverse){flex-direction:row-reverse}:global(.flex-xl-column){flex-direction:column}:global(.flex-xl-column-reverse){flex-direction:column-reverse}}:global(.justify-start){justify-content:flex-start}:global(.justify-end){justify-content:flex-end}:global(.justify-center){justify-content:center}:global(.justify-space-between){justify-content:space-between}:global(.justify-space-around){justify-content:space-around}@media only screen and (min-width: 600px){:global(.justify-sm-start){justify-content:flex-start}:global(.justify-sm-end){justify-content:flex-end}:global(.justify-sm-center){justify-content:center}:global(.justify-sm-space-between){justify-content:space-between}:global(.justify-sm-space-around){justify-content:space-around}}@media only screen and (min-width: 960px){:global(.justify-md-start){justify-content:flex-start}:global(.justify-md-end){justify-content:flex-end}:global(.justify-md-center){justify-content:center}:global(.justify-md-space-between){justify-content:space-between}:global(.justify-md-space-around){justify-content:space-around}}@media only screen and (min-width: 1264px){:global(.justify-lg-start){justify-content:flex-start}:global(.justify-lg-end){justify-content:flex-end}:global(.justify-lg-center){justify-content:center}:global(.justify-lg-space-between){justify-content:space-between}:global(.justify-lg-space-around){justify-content:space-around}}@media only screen and (min-width: 1904px){:global(.justify-xl-start){justify-content:flex-start}:global(.justify-xl-end){justify-content:flex-end}:global(.justify-xl-center){justify-content:center}:global(.justify-xl-space-between){justify-content:space-between}:global(.justify-xl-space-around){justify-content:space-around}}:global(.align-content-start){align-content:flex-start}:global(.align-content-end){align-content:flex-end}:global(.align-content-center){align-content:center}:global(.align-content-space-between){align-content:space-between}:global(.align-content-space-around){align-content:space-around}:global(.align-content-stretch){align-content:stretch}@media only screen and (min-width: 600px){:global(.align-sm-content-start){align-content:flex-start}:global(.align-sm-content-end){align-content:flex-end}:global(.align-sm-content-center){align-content:center}:global(.align-sm-content-space-between){align-content:space-between}:global(.align-sm-content-space-around){align-content:space-around}:global(.align-sm-content-stretch){align-content:stretch}}@media only screen and (min-width: 960px){:global(.align-md-content-start){align-content:flex-start}:global(.align-md-content-end){align-content:flex-end}:global(.align-md-content-center){align-content:center}:global(.align-md-content-space-between){align-content:space-between}:global(.align-md-content-space-around){align-content:space-around}:global(.align-md-content-stretch){align-content:stretch}}@media only screen and (min-width: 1264px){:global(.align-lg-content-start){align-content:flex-start}:global(.align-lg-content-end){align-content:flex-end}:global(.align-lg-content-center){align-content:center}:global(.align-lg-content-space-between){align-content:space-between}:global(.align-lg-content-space-around){align-content:space-around}:global(.align-lg-content-stretch){align-content:stretch}}@media only screen and (min-width: 1904px){:global(.align-xl-content-start){align-content:flex-start}:global(.align-xl-content-end){align-content:flex-end}:global(.align-xl-content-center){align-content:center}:global(.align-xl-content-space-between){align-content:space-between}:global(.align-xl-content-space-around){align-content:space-around}:global(.align-xl-content-stretch){align-content:stretch}}:global(.align-start){align-items:flex-start}:global(.align-end){align-items:flex-end}:global(.align-center){align-items:center}:global(.align-baseline){align-items:baseline}:global(.align-stretch){align-items:stretch}@media only screen and (min-width: 600px){:global(.align-sm-start){align-items:flex-start}:global(.align-sm-end){align-items:flex-end}:global(.align-sm-center){align-items:center}:global(.align-sm-baseline){align-items:baseline}:global(.align-sm-stretch){align-items:stretch}}@media only screen and (min-width: 960px){:global(.align-md-start){align-items:flex-start}:global(.align-md-end){align-items:flex-end}:global(.align-md-center){align-items:center}:global(.align-md-baseline){align-items:baseline}:global(.align-md-stretch){align-items:stretch}}@media only screen and (min-width: 1264px){:global(.align-lg-start){align-items:flex-start}:global(.align-lg-end){align-items:flex-end}:global(.align-lg-center){align-items:center}:global(.align-lg-baseline){align-items:baseline}:global(.align-lg-stretch){align-items:stretch}}@media only screen and (min-width: 1904px){:global(.align-xl-start){align-items:flex-start}:global(.align-xl-end){align-items:flex-end}:global(.align-xl-center){align-items:center}:global(.align-xl-baseline){align-items:baseline}:global(.align-xl-stretch){align-items:stretch}}:global(.align-self-start){align-self:flex-start}:global(.align-self-end){align-self:flex-end}:global(.align-self-center){align-self:center}:global(.align-self-baseline){align-self:baseline}:global(.align-self-stretch){align-self:stretch}:global(.align-self-auto){align-self:auto}@media only screen and (min-width: 600px){:global(.align-self-sm-start){align-self:flex-start}:global(.align-self-sm-end){align-self:flex-end}:global(.align-self-sm-center){align-self:center}:global(.align-self-sm-baseline){align-self:baseline}:global(.align-self-sm-stretch){align-self:stretch}:global(.align-self-sm-auto){align-self:auto}}@media only screen and (min-width: 960px){:global(.align-self-md-start){align-self:flex-start}:global(.align-self-md-end){align-self:flex-end}:global(.align-self-md-center){align-self:center}:global(.align-self-md-baseline){align-self:baseline}:global(.align-self-md-stretch){align-self:stretch}:global(.align-self-md-auto){align-self:auto}}@media only screen and (min-width: 1264px){:global(.align-self-lg-start){align-self:flex-start}:global(.align-self-lg-end){align-self:flex-end}:global(.align-self-lg-center){align-self:center}:global(.align-self-lg-baseline){align-self:baseline}:global(.align-self-lg-stretch){align-self:stretch}:global(.align-self-lg-auto){align-self:auto}}@media only screen and (min-width: 1904px){:global(.align-self-xl-start){align-self:flex-start}:global(.align-self-xl-end){align-self:flex-end}:global(.align-self-xl-center){align-self:center}:global(.align-self-xl-baseline){align-self:baseline}:global(.align-self-xl-stretch){align-self:stretch}:global(.align-self-xl-auto){align-self:auto}}:global(.flex-nowrap){flex-wrap:nowrap}:global(.flex-wrap){flex-wrap:wrap}:global(.flex-wrap-reverse){flex-wrap:wrap-reverse}@media only screen and (min-width: 600px){:global(.flex-sm-nowrap){flex-wrap:nowrap}:global(.flex-sm-wrap){flex-wrap:wrap}:global(.flex-sm-wrap-reverse){flex-wrap:wrap-reverse}}@media only screen and (min-width: 960px){:global(.flex-md-nowrap){flex-wrap:nowrap}:global(.flex-md-wrap){flex-wrap:wrap}:global(.flex-md-wrap-reverse){flex-wrap:wrap-reverse}}@media only screen and (min-width: 1264px){:global(.flex-lg-nowrap){flex-wrap:nowrap}:global(.flex-lg-wrap){flex-wrap:wrap}:global(.flex-lg-wrap-reverse){flex-wrap:wrap-reverse}}@media only screen and (min-width: 1904px){:global(.flex-xl-nowrap){flex-wrap:nowrap}:global(.flex-xl-wrap){flex-wrap:wrap}:global(.flex-xl-wrap-reverse){flex-wrap:wrap-reverse}}:global(.order-first){order:-1}:global(.order-last){order:13}:global(.order-0){order:0}:global(.order-1){order:1}:global(.order-2){order:2}:global(.order-3){order:3}:global(.order-4){order:4}:global(.order-5){order:5}:global(.order-6){order:6}:global(.order-7){order:7}:global(.order-8){order:8}:global(.order-9){order:9}:global(.order-10){order:10}:global(.order-11){order:11}:global(.order-12){order:12}@media only screen and (min-width: 600px){:global(.order-sm-first){order:-1}:global(.order-sm-last){order:13}:global(.order-sm-0){order:0}:global(.order-sm-1){order:1}:global(.order-sm-2){order:2}:global(.order-sm-3){order:3}:global(.order-sm-4){order:4}:global(.order-sm-5){order:5}:global(.order-sm-6){order:6}:global(.order-sm-7){order:7}:global(.order-sm-8){order:8}:global(.order-sm-9){order:9}:global(.order-sm-10){order:10}:global(.order-sm-11){order:11}:global(.order-sm-12){order:12}}@media only screen and (min-width: 960px){:global(.order-md-first){order:-1}:global(.order-md-last){order:13}:global(.order-md-0){order:0}:global(.order-md-1){order:1}:global(.order-md-2){order:2}:global(.order-md-3){order:3}:global(.order-md-4){order:4}:global(.order-md-5){order:5}:global(.order-md-6){order:6}:global(.order-md-7){order:7}:global(.order-md-8){order:8}:global(.order-md-9){order:9}:global(.order-md-10){order:10}:global(.order-md-11){order:11}:global(.order-md-12){order:12}}@media only screen and (min-width: 1264px){:global(.order-lg-first){order:-1}:global(.order-lg-last){order:13}:global(.order-lg-0){order:0}:global(.order-lg-1){order:1}:global(.order-lg-2){order:2}:global(.order-lg-3){order:3}:global(.order-lg-4){order:4}:global(.order-lg-5){order:5}:global(.order-lg-6){order:6}:global(.order-lg-7){order:7}:global(.order-lg-8){order:8}:global(.order-lg-9){order:9}:global(.order-lg-10){order:10}:global(.order-lg-11){order:11}:global(.order-lg-12){order:12}}@media only screen and (min-width: 1904px){:global(.order-xl-first){order:-1}:global(.order-xl-last){order:13}:global(.order-xl-0){order:0}:global(.order-xl-1){order:1}:global(.order-xl-2){order:2}:global(.order-xl-3){order:3}:global(.order-xl-4){order:4}:global(.order-xl-5){order:5}:global(.order-xl-6){order:6}:global(.order-xl-7){order:7}:global(.order-xl-8){order:8}:global(.order-xl-9){order:9}:global(.order-xl-10){order:10}:global(.order-xl-11){order:11}:global(.order-xl-12){order:12}}:global(.flex-grow-0){flex-grow:0}:global(.flex-grow-1){flex-grow:1}:global(.flex-shrink-0){flex-shrink:0}:global(.flex-shrink-1){flex-shrink:1}@media only screen and (min-width: 600px){:global(.flex-sm-grow-0){flex-grow:0}:global(.flex-sm-grow-1){flex-grow:1}:global(.flex-sm-shrink-0){flex-shrink:0}:global(.flex-sm-shrink-1){flex-shrink:1}}@media only screen and (min-width: 960px){:global(.flex-md-grow-0){flex-grow:0}:global(.flex-md-grow-1){flex-grow:1}:global(.flex-md-shrink-0){flex-shrink:0}:global(.flex-md-shrink-1){flex-shrink:1}}@media only screen and (min-width: 1264px){:global(.flex-lg-grow-0){flex-grow:0}:global(.flex-lg-grow-1){flex-grow:1}:global(.flex-lg-shrink-0){flex-shrink:0}:global(.flex-lg-shrink-1){flex-shrink:1}}@media only screen and (min-width: 1904px){:global(.flex-xl-grow-0){flex-grow:0}:global(.flex-xl-grow-1){flex-grow:1}:global(.flex-xl-shrink-0){flex-shrink:0}:global(.flex-xl-shrink-1){flex-shrink:1}}:global(.float-left){float:left}:global(.float-right){float:right}:global(.float-none){float:none}@media only screen and (min-width: 600px){:global(.float-sm-left){float:left}:global(.float-sm-right){float:right}:global(.float-sm-none){float:none}}@media only screen and (min-width: 960px){:global(.float-md-left){float:left}:global(.float-md-right){float:right}:global(.float-md-none){float:none}}@media only screen and (min-width: 1264px){:global(.float-lg-left){float:left}:global(.float-lg-right){float:right}:global(.float-lg-none){float:none}}@media only screen and (min-width: 1904px){:global(.float-xl-left){float:left}:global(.float-xl-right){float:right}:global(.float-xl-none){float:none}}:global(body),:global(html){height:100%}:global(html){font-size:16px;overflow-x:hidden;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}:global(body){font-family:Roboto, Segoe UI, sans-serif;line-height:1.5}:global(p){margin-bottom:16px}:global(.s-ripple-container){position:relative;overflow:hidden}:global(blockquote){padding:16px 0 16px 24px;font-size:18px;font-weight:300}:global(code),:global(kbd){border-radius:3px;font-size:85%;font-weight:900}:global(code){background-color:#fbe5e1;color:#c0341d;padding:0 0.4rem}:global(kbd){background:#212529;color:#fff;padding:0.2rem 0.4rem}:global(h1){font-size:6rem;line-height:6rem;letter-spacing:-0.015625em}:global(h1),:global(h2){font-weight:300;font-family:Roboto, Segoe UI, sans-serif}:global(h2){font-size:3.75rem;line-height:3.75rem;letter-spacing:-0.0083333333em}:global(h3){font-size:3rem;line-height:3.125rem;letter-spacing:normal}:global(h3),:global(h4){font-weight:400;font-family:Roboto, Segoe UI, sans-serif}:global(h4){font-size:2.125rem;line-height:2.5rem;letter-spacing:0.0073529412em}:global(h5){font-size:1.5rem;font-weight:400;letter-spacing:normal}:global(h5),:global(h6){line-height:2rem;font-family:Roboto, Segoe UI, sans-serif}:global(h6){font-size:1.25rem;font-weight:500;letter-spacing:0.0125em}:global(.text-h1){font-size:6rem;line-height:6rem;letter-spacing:-0.015625em}:global(.text-h1),:global(.text-h2){font-weight:300;font-family:Roboto, Segoe UI, sans-serif}:global(.text-h2){font-size:3.75rem;line-height:3.75rem;letter-spacing:-0.0083333333em}:global(.text-h3){font-size:3rem;line-height:3.125rem;letter-spacing:normal}:global(.text-h3),:global(.text-h4){font-weight:400;font-family:Roboto, Segoe UI, sans-serif}:global(.text-h4){font-size:2.125rem;line-height:2.5rem;letter-spacing:0.0073529412em}:global(.text-h5){font-size:1.5rem;font-weight:400;letter-spacing:normal}:global(.text-h5),:global(.text-h6){line-height:2rem;font-family:Roboto, Segoe UI, sans-serif}:global(.text-h6){font-size:1.25rem;font-weight:500;letter-spacing:0.0125em}:global(.text-subtitle-1){font-size:1rem;font-weight:400;line-height:1.75rem;letter-spacing:0.009375em}:global(.text-subtitle-1),:global(.text-subtitle-2){font-family:Roboto, Segoe UI, sans-serif}:global(.text-subtitle-2){font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em}:global(.text-body-1){font-size:1rem;line-height:1.5rem;letter-spacing:0.03125em}:global(.text-body-1),:global(.text-body-2){font-weight:400;font-family:Roboto, Segoe UI, sans-serif}:global(.text-body-2){font-size:0.875rem;line-height:1.25rem;letter-spacing:0.0178571429em}:global(.text-button){font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}:global(.text-caption){font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em}:global(.text-caption),:global(.text-overline){font-size:0.75rem;font-family:Roboto, Segoe UI, sans-serif}:global(.text-overline){font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;text-transform:uppercase}@media only screen and (min-width: 600px){:global(.text-sm-h1){font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-h1){font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-h1){font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-h1){font-size:6rem;font-weight:300;line-height:6rem;letter-spacing:-0.015625em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-h2){font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-h2){font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-h2){font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-h2){font-size:3.75rem;font-weight:300;line-height:3.75rem;letter-spacing:-0.0083333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-h3){font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-h3){font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-h3){font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-h3){font-size:3rem;font-weight:400;line-height:3.125rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-h4){font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-h4){font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-h4){font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-h4){font-size:2.125rem;font-weight:400;line-height:2.5rem;letter-spacing:0.0073529412em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-h5){font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-h5){font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-h5){font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-h5){font-size:1.5rem;font-weight:400;line-height:2rem;letter-spacing:normal;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-h6){font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-h6){font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-h6){font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-h6){font-size:1.25rem;font-weight:500;line-height:2rem;letter-spacing:0.0125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-subtitle-1){font-size:1rem;font-weight:400;line-height:1.75rem;letter-spacing:0.009375em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-subtitle-1){font-size:1rem;font-weight:400;line-height:1.75rem;letter-spacing:0.009375em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-subtitle-1){font-size:1rem;font-weight:400;line-height:1.75rem;letter-spacing:0.009375em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-subtitle-1){font-size:1rem;font-weight:400;line-height:1.75rem;letter-spacing:0.009375em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-subtitle-2){font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-subtitle-2){font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-subtitle-2){font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-subtitle-2){font-size:0.875rem;font-weight:500;line-height:1.375rem;letter-spacing:0.0071428571em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-body-1){font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-body-1){font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-body-1){font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-body-1){font-size:1rem;font-weight:400;line-height:1.5rem;letter-spacing:0.03125em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-body-2){font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-body-2){font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-body-2){font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-body-2){font-size:0.875rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0178571429em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-button){font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 960px){:global(.text-md-button){font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1264px){:global(.text-lg-button){font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1904px){:global(.text-xl-button){font-size:0.875rem;font-weight:500;line-height:2.25rem;letter-spacing:0.0892857143em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 600px){:global(.text-sm-caption){font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 960px){:global(.text-md-caption){font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1264px){:global(.text-lg-caption){font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 1904px){:global(.text-xl-caption){font-size:0.75rem;font-weight:400;line-height:1.25rem;letter-spacing:0.0333333333em;font-family:Roboto, Segoe UI, sans-serif}}@media only screen and (min-width: 600px){:global(.text-sm-overline){font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 960px){:global(.text-md-overline){font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1264px){:global(.text-lg-overline){font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}@media only screen and (min-width: 1904px){:global(.text-xl-overline){font-size:0.75rem;font-weight:500;line-height:2rem;letter-spacing:0.1666666667em;font-family:Roboto, Segoe UI, sans-serif;text-transform:uppercase}}:global(ol),:global(ul){padding-left:24px}:global(.s-app){min-height:100%}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{ theme: 0 }
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["theme"];
    	}

    	get theme() {
    		return this.$$.ctx[0];
    	}

    	set theme(theme) {
    		this.$set({ theme });
    		flush();
    	}
    }

    const filter = (classes) => classes.filter((x) => !!x);
    const format = (classes) => classes.split(' ').filter((x) => !!x);

    /**
     * @param node {Element}
     * @param classes {Array<string>}
     */
    var Class = (node, _classes) => {
      let classes = _classes;
      node.classList.add(...format(filter(classes).join(' ')));
      return {
        update(_newClasses) {
          const newClasses = _newClasses;
          newClasses.forEach((klass, i) => {
            if (klass) node.classList.add(...format(klass));
            else if (classes[i]) node.classList.remove(...format(classes[i]));
          });
          classes = newClasses;
        },
      };
    };

    /* node_modules\svelte-materialify\dist\components\Button\Button.svelte generated by Svelte v3.38.2 */
    const file$1 = "node_modules\\svelte-materialify\\dist\\components\\Button\\Button.svelte";

    function create_fragment$2(ctx) {
    	let button_1;
    	let span;
    	let slot;
    	let button_1_class_value;
    	let Class_action;
    	let Ripple_action;
    	let mounted;
    	let dispose;

    	let button_1_levels = [
    		{
    			class: button_1_class_value = "s-btn size-" + /*size*/ ctx[5] + " " + /*klass*/ ctx[1]
    		},
    		{ type: /*type*/ ctx[14] },
    		{ style: /*style*/ ctx[16] },
    		{ disabled: /*disabled*/ ctx[11] },
    		{ "aria-disabled": /*disabled*/ ctx[11] },
    		/*$$restProps*/ ctx[17]
    	];

    	let button_1_data = {};

    	for (let i = 0; i < button_1_levels.length; i += 1) {
    		button_1_data = assign(button_1_data, button_1_levels[i]);
    	}

    	const block_1 = {
    		c: function create() {
    			button_1 = element("button");
    			span = element("span");
    			slot = element("slot");
    			this.c = noop;
    			add_location(slot, file$1, 273, 4, 5937);
    			attr_dev(span, "class", "s-btn__content");
    			add_location(span, file$1, 272, 2, 5902);
    			set_attributes(button_1, button_1_data);
    			toggle_class(button_1, "s-btn--fab", /*fab*/ ctx[2]);
    			toggle_class(button_1, "icon", /*icon*/ ctx[3]);
    			toggle_class(button_1, "block", /*block*/ ctx[4]);
    			toggle_class(button_1, "tile", /*tile*/ ctx[6]);
    			toggle_class(button_1, "text", /*text*/ ctx[7] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "depressed", /*depressed*/ ctx[8] || /*text*/ ctx[7] || /*disabled*/ ctx[11] || /*outlined*/ ctx[9] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "outlined", /*outlined*/ ctx[9]);
    			toggle_class(button_1, "rounded", /*rounded*/ ctx[10]);
    			toggle_class(button_1, "disabled", /*disabled*/ ctx[11]);
    			add_location(button_1, file$1, 252, 0, 5452);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button_1, anchor);
    			append_dev(button_1, span);
    			append_dev(span, slot);
    			/*button_1_binding*/ ctx[19](button_1);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(Class_action = Class.call(null, button_1, [/*active*/ ctx[12] && /*activeClass*/ ctx[13]])),
    					action_destroyer(Ripple_action = Ripple.call(null, button_1, /*ripple*/ ctx[15])),
    					listen_dev(button_1, "click", /*click_handler*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			set_attributes(button_1, button_1_data = get_spread_update(button_1_levels, [
    				dirty & /*size, klass*/ 34 && button_1_class_value !== (button_1_class_value = "s-btn size-" + /*size*/ ctx[5] + " " + /*klass*/ ctx[1]) && { class: button_1_class_value },
    				dirty & /*type*/ 16384 && { type: /*type*/ ctx[14] },
    				dirty & /*style*/ 65536 && { style: /*style*/ ctx[16] },
    				dirty & /*disabled*/ 2048 && { disabled: /*disabled*/ ctx[11] },
    				dirty & /*disabled*/ 2048 && { "aria-disabled": /*disabled*/ ctx[11] },
    				dirty & /*$$restProps*/ 131072 && /*$$restProps*/ ctx[17]
    			]));

    			if (Class_action && is_function(Class_action.update) && dirty & /*active, activeClass*/ 12288) Class_action.update.call(null, [/*active*/ ctx[12] && /*activeClass*/ ctx[13]]);
    			if (Ripple_action && is_function(Ripple_action.update) && dirty & /*ripple*/ 32768) Ripple_action.update.call(null, /*ripple*/ ctx[15]);
    			toggle_class(button_1, "s-btn--fab", /*fab*/ ctx[2]);
    			toggle_class(button_1, "icon", /*icon*/ ctx[3]);
    			toggle_class(button_1, "block", /*block*/ ctx[4]);
    			toggle_class(button_1, "tile", /*tile*/ ctx[6]);
    			toggle_class(button_1, "text", /*text*/ ctx[7] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "depressed", /*depressed*/ ctx[8] || /*text*/ ctx[7] || /*disabled*/ ctx[11] || /*outlined*/ ctx[9] || /*icon*/ ctx[3]);
    			toggle_class(button_1, "outlined", /*outlined*/ ctx[9]);
    			toggle_class(button_1, "rounded", /*rounded*/ ctx[10]);
    			toggle_class(button_1, "disabled", /*disabled*/ ctx[11]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button_1);
    			/*button_1_binding*/ ctx[19](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block: block_1,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block_1;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"class","fab","icon","block","size","tile","text","depressed","outlined","rounded","disabled","active","activeClass","type","ripple","style","button"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("null", slots, []);
    	let { class: klass = "" } = $$props;
    	let { fab = false } = $$props;
    	let { icon = false } = $$props;
    	let { block = false } = $$props;
    	let { size = "default" } = $$props;
    	let { tile = false } = $$props;
    	let { text = false } = $$props;
    	let { depressed = false } = $$props;
    	let { outlined = false } = $$props;
    	let { rounded = false } = $$props;
    	let { disabled = null } = $$props;
    	let { active = false } = $$props;
    	let { activeClass = "active" } = $$props;
    	let { type = "button" } = $$props;
    	let { ripple = {} } = $$props;
    	let { style = null } = $$props;
    	let { button = null } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function button_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			button = $$value;
    			$$invalidate(0, button);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(17, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("class" in $$new_props) $$invalidate(1, klass = $$new_props.class);
    		if ("fab" in $$new_props) $$invalidate(2, fab = $$new_props.fab);
    		if ("icon" in $$new_props) $$invalidate(3, icon = $$new_props.icon);
    		if ("block" in $$new_props) $$invalidate(4, block = $$new_props.block);
    		if ("size" in $$new_props) $$invalidate(5, size = $$new_props.size);
    		if ("tile" in $$new_props) $$invalidate(6, tile = $$new_props.tile);
    		if ("text" in $$new_props) $$invalidate(7, text = $$new_props.text);
    		if ("depressed" in $$new_props) $$invalidate(8, depressed = $$new_props.depressed);
    		if ("outlined" in $$new_props) $$invalidate(9, outlined = $$new_props.outlined);
    		if ("rounded" in $$new_props) $$invalidate(10, rounded = $$new_props.rounded);
    		if ("disabled" in $$new_props) $$invalidate(11, disabled = $$new_props.disabled);
    		if ("active" in $$new_props) $$invalidate(12, active = $$new_props.active);
    		if ("activeClass" in $$new_props) $$invalidate(13, activeClass = $$new_props.activeClass);
    		if ("type" in $$new_props) $$invalidate(14, type = $$new_props.type);
    		if ("ripple" in $$new_props) $$invalidate(15, ripple = $$new_props.ripple);
    		if ("style" in $$new_props) $$invalidate(16, style = $$new_props.style);
    		if ("button" in $$new_props) $$invalidate(0, button = $$new_props.button);
    	};

    	$$self.$capture_state = () => ({
    		Ripple,
    		Class,
    		klass,
    		fab,
    		icon,
    		block,
    		size,
    		tile,
    		text,
    		depressed,
    		outlined,
    		rounded,
    		disabled,
    		active,
    		activeClass,
    		type,
    		ripple,
    		style,
    		button
    	});

    	$$self.$inject_state = $$new_props => {
    		if ("klass" in $$props) $$invalidate(1, klass = $$new_props.klass);
    		if ("fab" in $$props) $$invalidate(2, fab = $$new_props.fab);
    		if ("icon" in $$props) $$invalidate(3, icon = $$new_props.icon);
    		if ("block" in $$props) $$invalidate(4, block = $$new_props.block);
    		if ("size" in $$props) $$invalidate(5, size = $$new_props.size);
    		if ("tile" in $$props) $$invalidate(6, tile = $$new_props.tile);
    		if ("text" in $$props) $$invalidate(7, text = $$new_props.text);
    		if ("depressed" in $$props) $$invalidate(8, depressed = $$new_props.depressed);
    		if ("outlined" in $$props) $$invalidate(9, outlined = $$new_props.outlined);
    		if ("rounded" in $$props) $$invalidate(10, rounded = $$new_props.rounded);
    		if ("disabled" in $$props) $$invalidate(11, disabled = $$new_props.disabled);
    		if ("active" in $$props) $$invalidate(12, active = $$new_props.active);
    		if ("activeClass" in $$props) $$invalidate(13, activeClass = $$new_props.activeClass);
    		if ("type" in $$props) $$invalidate(14, type = $$new_props.type);
    		if ("ripple" in $$props) $$invalidate(15, ripple = $$new_props.ripple);
    		if ("style" in $$props) $$invalidate(16, style = $$new_props.style);
    		if ("button" in $$props) $$invalidate(0, button = $$new_props.button);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		button,
    		klass,
    		fab,
    		icon,
    		block,
    		size,
    		tile,
    		text,
    		depressed,
    		outlined,
    		rounded,
    		disabled,
    		active,
    		activeClass,
    		type,
    		ripple,
    		style,
    		$$restProps,
    		click_handler,
    		button_1_binding
    	];
    }

    class Button extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:global(.s-btn){align-items:center;border-radius:4px;display:inline-flex;flex:0 0 auto;overflow:hidden;position:relative;outline:0;justify-content:center;user-select:none;vertical-align:middle;white-space:nowrap;text-decoration:none;transition-duration:0.28s;transition-property:box-shadow, transform, opacity;background-color:var(--theme-app-bar);box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12)}:global(.s-btn) :global(.s-icon),:global(.s-btn) :global(a){color:inherit}:global(.s-btn) :global(.s-btn__content){display:flex;align-items:center;flex:1 0 auto;color:inherit;justify-content:inherit;line-height:normal;position:relative;font-size:inherit;font-weight:500;letter-spacing:0.0892857143em;text-transform:uppercase}:global(.s-btn:before){border-radius:inherit;bottom:0;color:inherit;content:"";left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:opacity 0.2s cubic-bezier(0.4, 0, 0.6, 1);background-color:currentColor}:global(.s-btn.size-x-small){font-size:0.625rem}:global(.s-btn.size-small){font-size:0.75rem}:global(.s-btn.size-default),:global(.s-btn.size-large){font-size:0.875rem}:global(.s-btn.size-x-large){font-size:1rem}:global(.s-btn:not(.disabled):hover:before){opacity:0.08}:global(.s-btn:not(.disabled).active:before){opacity:0.18}:global(.s-btn:not(.disabled).focus-visible:before){opacity:0.24}:global(.s-btn:not(.outlined).error-color),:global(.s-btn:not(.outlined).info-color),:global(.s-btn:not(.outlined).primary-color),:global(.s-btn:not(.outlined).secondary-color),:global(.s-btn:not(.outlined).success-color),:global(.s-btn:not(.outlined).warning-color){color:#fff}:global(.s-btn:not(.icon):not(.s-btn--fab).size-x-small){height:20px;min-width:36px;padding:0 8.8888888889px}:global(.s-btn:not(.icon):not(.s-btn--fab).size-small){height:28px;min-width:50px;padding:0 12.4444444444px}:global(.s-btn:not(.icon):not(.s-btn--fab).size-default){height:36px;min-width:64px;padding:0 16px}:global(.s-btn:not(.icon):not(.s-btn--fab).size-large){height:44px;min-width:78px;padding:0 19.5555555556px}:global(.s-btn:not(.icon):not(.s-btn--fab).size-x-large){height:52px;min-width:92px;padding:0 23.1111111111px}:global(.s-btn:not(.disabled):not(.depressed)){will-change:box-shadow}:global(.s-btn.block){display:flex;flex:1 0 auto;min-width:100% !important;max-width:auto}:global(.s-btn.tile){border-radius:0}:global(.s-btn.text){background-color:transparent}:global(.s-btn.depressed){box-shadow:none}:global(.s-btn.outlined){border:1px solid;background-color:transparent !important}:global(.s-btn.rounded){border-radius:9999px}:global(.s-btn.disabled){pointer-events:none;color:var(--theme-buttons-disabled)}:global(.s-btn.disabled:not(.flat):not(.text):not(.outlined)){background-color:var(--theme-buttons-disabled)}:global(.s-btn.icon.size-x-small){height:20px;width:20px}:global(.s-btn.icon.size-small){height:28px;width:28px}:global(.s-btn.icon.size-default){height:36px;width:36px}:global(.s-btn.icon.size-large){height:44px;width:44px}:global(.s-btn.icon.size-x-large){height:52px;width:52px}:global(.s-btn.icon),:global(.s-btn.s-btn--fab){border-radius:50%;min-width:0;min-height:0;padding:0}:global(.s-btn.icon.size-x-small) :global(.s-icon),:global(.s-btn.s-btn--fab.size-x-small) :global(.s-icon){font-size:18px}:global(.s-btn.icon.size-default) :global(.s-icon),:global(.s-btn.icon.size-small) :global(.s-icon),:global(.s-btn.s-btn--fab.size-default) :global(.s-icon),:global(.s-btn.s-btn--fab.size-small) :global(.s-icon){font-size:24px}:global(.s-btn.icon.size-large) :global(.s-icon),:global(.s-btn.s-btn--fab.size-large) :global(.s-icon){font-size:28px}:global(.s-btn.icon.size-x-large) :global(.s-icon),:global(.s-btn.s-btn--fab.size-x-large) :global(.s-icon){font-size:32px}:global(.s-btn.s-btn--fab.size-x-small){height:32px;width:32px}:global(.s-btn.s-btn--fab.size-small){height:40px;width:40px}:global(.s-btn.s-btn--fab.size-default){height:56px;width:56px}:global(.s-btn.s-btn--fab.size-large){height:64px;width:64px}:global(.s-btn.s-btn--fab.size-x-large){height:72px;width:72px}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				class: 1,
    				fab: 2,
    				icon: 3,
    				block: 4,
    				size: 5,
    				tile: 6,
    				text: 7,
    				depressed: 8,
    				outlined: 9,
    				rounded: 10,
    				disabled: 11,
    				active: 12,
    				activeClass: 13,
    				type: 14,
    				ripple: 15,
    				style: 16,
    				button: 0
    			}
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return [
    			"class",
    			"fab",
    			"icon",
    			"block",
    			"size",
    			"tile",
    			"text",
    			"depressed",
    			"outlined",
    			"rounded",
    			"disabled",
    			"active",
    			"activeClass",
    			"type",
    			"ripple",
    			"style",
    			"button"
    		];
    	}

    	get class() {
    		return this.$$.ctx[1];
    	}

    	set class(klass) {
    		this.$set({ class: klass });
    		flush();
    	}

    	get fab() {
    		return this.$$.ctx[2];
    	}

    	set fab(fab) {
    		this.$set({ fab });
    		flush();
    	}

    	get icon() {
    		return this.$$.ctx[3];
    	}

    	set icon(icon) {
    		this.$set({ icon });
    		flush();
    	}

    	get block() {
    		return this.$$.ctx[4];
    	}

    	set block(block) {
    		this.$set({ block });
    		flush();
    	}

    	get size() {
    		return this.$$.ctx[5];
    	}

    	set size(size) {
    		this.$set({ size });
    		flush();
    	}

    	get tile() {
    		return this.$$.ctx[6];
    	}

    	set tile(tile) {
    		this.$set({ tile });
    		flush();
    	}

    	get text() {
    		return this.$$.ctx[7];
    	}

    	set text(text) {
    		this.$set({ text });
    		flush();
    	}

    	get depressed() {
    		return this.$$.ctx[8];
    	}

    	set depressed(depressed) {
    		this.$set({ depressed });
    		flush();
    	}

    	get outlined() {
    		return this.$$.ctx[9];
    	}

    	set outlined(outlined) {
    		this.$set({ outlined });
    		flush();
    	}

    	get rounded() {
    		return this.$$.ctx[10];
    	}

    	set rounded(rounded) {
    		this.$set({ rounded });
    		flush();
    	}

    	get disabled() {
    		return this.$$.ctx[11];
    	}

    	set disabled(disabled) {
    		this.$set({ disabled });
    		flush();
    	}

    	get active() {
    		return this.$$.ctx[12];
    	}

    	set active(active) {
    		this.$set({ active });
    		flush();
    	}

    	get activeClass() {
    		return this.$$.ctx[13];
    	}

    	set activeClass(activeClass) {
    		this.$set({ activeClass });
    		flush();
    	}

    	get type() {
    		return this.$$.ctx[14];
    	}

    	set type(type) {
    		this.$set({ type });
    		flush();
    	}

    	get ripple() {
    		return this.$$.ctx[15];
    	}

    	set ripple(ripple) {
    		this.$set({ ripple });
    		flush();
    	}

    	get style() {
    		return this.$$.ctx[16];
    	}

    	set style(style) {
    		this.$set({ style });
    		flush();
    	}

    	get button() {
    		return this.$$.ctx[0];
    	}

    	set button(button) {
    		this.$set({ button });
    		flush();
    	}
    }

    /* eslint-disable */
    // Shamefully ripped from https://github.com/lukeed/uid
    let IDX = 36;
    let HEX = '';
    while (IDX--) HEX += IDX.toString(36);

    /* src\components\child-ui.svelte generated by Svelte v3.38.2 */
    const file = "src\\components\\child-ui.svelte";

    function create_fragment$1(ctx) {
    	let material_app;
    	let button;
    	let t1;
    	let h4;
    	let t3;
    	let button_a;

    	const block = {
    		c: function create() {
    			material_app = element("material-app");
    			button = element("button");
    			button.textContent = "zzzzzzzzz";
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "hello from child 2";
    			t3 = space();
    			button_a = element("button-a");
    			this.c = noop;
    			add_location(button, file, 8, 4, 145);
    			add_location(material_app, file, 7, 0, 125);
    			add_location(h4, file, 10, 0, 190);
    			add_location(button_a, file, 11, 0, 219);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, material_app, anchor);
    			append_dev(material_app, button);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h4, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button_a, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(material_app);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button_a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("child-ui", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<child-ui> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Button, MaterialApp });
    	return [];
    }

    class Child_ui extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>h4{color:pink}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{}
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("child-ui", Child_ui);

    /* src\App.svelte generated by Svelte v3.38.2 */

    function create_fragment(ctx) {
    	const block = {
    		c: function create() {
    			this.c = noop;
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("null", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<null> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{}
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z$2 = "@font-face {\n  font-family: 'livvic';\n  src: url(\"/resources/fonts/livvic-v8-vietnamese_latin-regular.eot\") format(\"eot\");\n  src: url(\"/resources/fonts/livvic-v8-vietnamese_latin-regular.svg\") format(\"svg\");\n  src: url(\"/resources/fonts/livvic-v8-vietnamese_latin-regular.ttf\") format(\"ttf\");\n  src: url(\"/resources/fonts/livvic-v8-vietnamese_latin-regular.woff\") format(\"woff\");\n  src: url(\"/resources/fonts/livvic-v8-vietnamese_latin-regular.woff2\") format(\"woff2\"); }\n";
    styleInject(css_248z$2);

    var css_248z$1 = "";
    styleInject(css_248z$1);

    var css_248z = "html, body {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  padding: 0; }\n\nbody {\n  color: black;\n  margin: 0;\n  padding: 8px;\n  box-sizing: border-box;\n  font-family: 'livvic', sans-serif; }\n";
    styleInject(css_248z);

    exports.App = App;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
//# sourceMappingURL=bundle.js.map
