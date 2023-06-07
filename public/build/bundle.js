
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
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
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
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
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
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
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
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
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.1' }, detail), { bubbles: true }));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
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
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function serialize(form) {
      const response = {};

      [...form.elements].forEach(function elements(input, _index) {
        // I know this "switch (true)" isn't beautiful, but it works!!!
        switch (true) {
          case !input.name:
          case input.disabled:
          case /(file|reset|submit|button)/i.test(input.type):
            break;
          case /(select-multiple)/i.test(input.type):
            response[input.name] = [];
            [...input.options].forEach(function options(option, _selectIndex) {
              if (option.selected) {
                response[input.name].push(option.value);
              }
            });
            break;
          case /(radio)/i.test(input.type):
            if (input.checked) {
              response[input.name] = input.value;
            }
            break;
          case /(checkbox)/i.test(input.type):
            if (input.checked) {
              response[input.name] = [...(response[input.name] || []), input.value];
            }
            break;
          default:
            if (input.value) {
              response[input.name] = input.value;
            }
            break;
        }
      });
      return response;
    }

    function deserialize(form, values) {
      [...form.elements].forEach(function elements(input, _index) {
        // I know this "switch (true)" isn't beautiful, but it works!!!
        switch (true) {
          case !input.name:
          case input.disabled:
          case /(file|reset|submit|button)/i.test(input.type):
            break;
          case /(select-multiple)/i.test(input.type):
            [...input.options].forEach(function options(option, _selectIndex) {
              option.selected =
                values[input.name] && values[input.name].includes(option.value);
            });
            break;
          case /(radio)/i.test(input.type):
            input.checked =
              values[input.name] && values[input.name] === input.value;
            break;
          case /(checkbox)/i.test(input.type):
            input.checked =
              values[input.name] && values[input.name].includes(input.value);
            break;
          default:
            input.value = values[input.name] || "";
            break;
        }
      });
    }

    function getValues(node) {
      let initialUpdateDone = 0;

      const inputs = [...node.getElementsByTagName('input')];

      inputs.forEach(el => {
        el.oninput = node.onchange;
      });

      node.addEventListener('input', handleUpdate);

      function handleUpdate() {
        node.dispatchEvent(new CustomEvent('update', {
          detail: { ...serialize(node) }
        }));
      }

      handleUpdate();

      return {
        update(values) {
          if (initialUpdateDone === 2) {
            deserialize(node, values);
          }
          else {
            initialUpdateDone += 1;
          }
        },
        destroy() {
          node.removeEventListener('input', handleUpdate);
        }
      };
    }

    function useActions(node, actions = []) {
      let cleanUpFunctions = [];

      // Apply each action
      actions.forEach(([action, options]) => {

        // Save the destroy method, supply a dummy one if the action doesn't contain one.
        const { destroy = () => { } } = action(node, options) || { destroy: () => { } };
        cleanUpFunctions.push(destroy);
      });

      return {
        destroy() {
          cleanUpFunctions.forEach(destroy => destroy());
        }
      };
    }

    /* node_modules\@svelteschool\svelte-forms\src\Form.svelte generated by Svelte v3.59.1 */
    const file$5 = "node_modules\\@svelteschool\\svelte-forms\\src\\Form.svelte";

    function create_fragment$5(ctx) {
    	let form;
    	let getValues_action;
    	let useActions_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			form = element("form");
    			if (default_slot) default_slot.c();
    			add_location(form, file$5, 8, 0, 193);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);

    			if (default_slot) {
    				default_slot.m(form, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(form, "update", /*update_handler*/ ctx[5], false, false, false, false),
    					action_destroyer(getValues_action = getValues.call(null, form, /*values*/ ctx[0])),
    					action_destroyer(useActions_action = useActions.call(null, form, /*actions*/ ctx[1])),
    					listen_dev(form, "submit", /*submit_handler*/ ctx[4], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (getValues_action && is_function(getValues_action.update) && dirty & /*values*/ 1) getValues_action.update.call(null, /*values*/ ctx[0]);
    			if (useActions_action && is_function(useActions_action.update) && dirty & /*actions*/ 2) useActions_action.update.call(null, /*actions*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots('Form', slots, ['default']);
    	let { values = undefined } = $$props;
    	let { actions = [] } = $$props;
    	const writable_props = ['values', 'actions'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	function submit_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const update_handler = ({ detail }) => $$invalidate(0, values = detail);

    	$$self.$$set = $$props => {
    		if ('values' in $$props) $$invalidate(0, values = $$props.values);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ getValues, useActions, values, actions });

    	$$self.$inject_state = $$props => {
    		if ('values' in $$props) $$invalidate(0, values = $$props.values);
    		if ('actions' in $$props) $$invalidate(1, actions = $$props.actions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [values, actions, $$scope, slots, submit_handler, update_handler];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { values: 0, actions: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get values() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get actions() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\OsuRow.svelte generated by Svelte v3.59.1 */

    const file$4 = "src\\components\\OsuRow.svelte";

    function create_fragment$4(ctx) {
    	let a;
    	let div4;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let span;
    	let t4;
    	let t5;
    	let div3;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*description*/ ctx[1]);
    			t3 = space();
    			span = element("span");
    			t4 = text(/*date*/ ctx[2]);
    			t5 = space();
    			div3 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "title svelte-1co4b56");
    			add_location(div0, file$4, 10, 6, 227);
    			attr_dev(span, "class", "period svelte-1co4b56");
    			add_location(span, file$4, 13, 8, 325);
    			attr_dev(div1, "class", "description svelte-1co4b56");
    			add_location(div1, file$4, 11, 6, 267);
    			attr_dev(div2, "class", "left svelte-1co4b56");
    			add_location(div2, file$4, 9, 4, 201);
    			attr_dev(div3, "class", "right svelte-1co4b56");
    			add_location(div3, file$4, 16, 4, 391);
    			attr_dev(div4, "class", "osu-row svelte-1co4b56");
    			add_location(div4, file$4, 8, 2, 174);
    			attr_dev(a, "href", /*link*/ ctx[3]);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener noreferrer");
    			attr_dev(a, "class", "svelte-1co4b56");
    			add_location(a, file$4, 7, 0, 111);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, div4);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, span);
    			append_dev(span, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);

    			if (default_slot) {
    				default_slot.m(div3, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (!current || dirty & /*description*/ 2) set_data_dev(t2, /*description*/ ctx[1]);
    			if (!current || dirty & /*date*/ 4) set_data_dev(t4, /*date*/ ctx[2]);

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*link*/ 8) {
    				attr_dev(a, "href", /*link*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('OsuRow', slots, ['default']);
    	let { title } = $$props;
    	let { description } = $$props;
    	let { date } = $$props;
    	let { link } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (title === undefined && !('title' in $$props || $$self.$$.bound[$$self.$$.props['title']])) {
    			console.warn("<OsuRow> was created without expected prop 'title'");
    		}

    		if (description === undefined && !('description' in $$props || $$self.$$.bound[$$self.$$.props['description']])) {
    			console.warn("<OsuRow> was created without expected prop 'description'");
    		}

    		if (date === undefined && !('date' in $$props || $$self.$$.bound[$$self.$$.props['date']])) {
    			console.warn("<OsuRow> was created without expected prop 'date'");
    		}

    		if (link === undefined && !('link' in $$props || $$self.$$.bound[$$self.$$.props['link']])) {
    			console.warn("<OsuRow> was created without expected prop 'link'");
    		}
    	});

    	const writable_props = ['title', 'description', 'date', 'link'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<OsuRow> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('description' in $$props) $$invalidate(1, description = $$props.description);
    		if ('date' in $$props) $$invalidate(2, date = $$props.date);
    		if ('link' in $$props) $$invalidate(3, link = $$props.link);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ title, description, date, link });

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('description' in $$props) $$invalidate(1, description = $$props.description);
    		if ('date' in $$props) $$invalidate(2, date = $$props.date);
    		if ('link' in $$props) $$invalidate(3, link = $$props.link);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, description, date, link, $$scope, slots];
    }

    class OsuRow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			title: 0,
    			description: 1,
    			date: 2,
    			link: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OsuRow",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get title() {
    		throw new Error("<OsuRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<OsuRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<OsuRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<OsuRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get date() {
    		throw new Error("<OsuRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<OsuRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get link() {
    		throw new Error("<OsuRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set link(value) {
    		throw new Error("<OsuRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Tournament.svelte generated by Svelte v3.59.1 */
    const file$3 = "src\\components\\Tournament.svelte";

    // (11:0) <OsuRow {link} {title} {description} {date}>
    function create_default_slot$3(ctx) {
    	let div2;
    	let div0;
    	let b;
    	let t0_value = /*tournament*/ ctx[0].placement + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let t3_value = /*tournament*/ ctx[0].participants + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text("/ ");
    			t3 = text(t3_value);
    			add_location(b, file$3, 12, 27, 411);
    			attr_dev(div0, "class", "placement svelte-o9n0mc");
    			add_location(div0, file$3, 12, 4, 388);
    			attr_dev(div1, "class", "participants");
    			add_location(div1, file$3, 13, 4, 452);
    			attr_dev(div2, "class", "content svelte-o9n0mc");
    			add_location(div2, file$3, 11, 2, 361);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, b);
    			append_dev(b, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tournament*/ 1 && t0_value !== (t0_value = /*tournament*/ ctx[0].placement + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*tournament*/ 1 && t3_value !== (t3_value = /*tournament*/ ctx[0].participants + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(11:0) <OsuRow {link} {title} {description} {date}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let osurow;
    	let current;

    	osurow = new OsuRow({
    			props: {
    				link: /*link*/ ctx[4],
    				title: /*title*/ ctx[1],
    				description: /*description*/ ctx[2],
    				date: /*date*/ ctx[3],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(osurow.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(osurow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const osurow_changes = {};
    			if (dirty & /*link*/ 16) osurow_changes.link = /*link*/ ctx[4];
    			if (dirty & /*title*/ 2) osurow_changes.title = /*title*/ ctx[1];
    			if (dirty & /*description*/ 4) osurow_changes.description = /*description*/ ctx[2];
    			if (dirty & /*date*/ 8) osurow_changes.date = /*date*/ ctx[3];

    			if (dirty & /*$$scope, tournament*/ 33) {
    				osurow_changes.$$scope = { dirty, ctx };
    			}

    			osurow.$set(osurow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(osurow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(osurow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(osurow, detaching);
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
    	let link;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tournament', slots, []);
    	let { tournament } = $$props;
    	let title, description, date;

    	$$self.$$.on_mount.push(function () {
    		if (tournament === undefined && !('tournament' in $$props || $$self.$$.bound[$$self.$$.props['tournament']])) {
    			console.warn("<Tournament> was created without expected prop 'tournament'");
    		}
    	});

    	const writable_props = ['tournament'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tournament> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('tournament' in $$props) $$invalidate(0, tournament = $$props.tournament);
    	};

    	$$self.$capture_state = () => ({
    		OsuRow,
    		tournament,
    		title,
    		description,
    		date,
    		link
    	});

    	$$self.$inject_state = $$props => {
    		if ('tournament' in $$props) $$invalidate(0, tournament = $$props.tournament);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('description' in $$props) $$invalidate(2, description = $$props.description);
    		if ('date' in $$props) $$invalidate(3, date = $$props.date);
    		if ('link' in $$props) $$invalidate(4, link = $$props.link);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*tournament*/ 1) {
    			$$invalidate(1, title = tournament.name + (tournament.short ? ` (${tournament.short})` : ''));
    		}

    		if ($$self.$$.dirty & /*tournament*/ 1) {
    			$$invalidate(2, description = tournament.description);
    		}

    		if ($$self.$$.dirty & /*tournament*/ 1) {
    			$$invalidate(3, date = tournament.period);
    		}

    		if ($$self.$$.dirty & /*tournament*/ 1) {
    			$$invalidate(4, link = tournament.link);
    		}
    	};

    	return [tournament, title, description, date, link];
    }

    class Tournament extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { tournament: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tournament",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get tournament() {
    		throw new Error("<Tournament>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tournament(value) {
    		throw new Error("<Tournament>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Staff.svelte generated by Svelte v3.59.1 */
    const file$2 = "src\\components\\Staff.svelte";

    // (13:4) {#if staff.stream}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("📺");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(13:4) {#if staff.stream}",
    		ctx
    	});

    	return block;
    }

    // (16:4) {#if staff.commentary}
    function create_if_block_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("🎙️");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(16:4) {#if staff.commentary}",
    		ctx
    	});

    	return block;
    }

    // (19:4) {#if staff.referee}
    function create_if_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("👮");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(19:4) {#if staff.referee}",
    		ctx
    	});

    	return block;
    }

    // (22:4) {#if staff.mappool}
    function create_if_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("🎶");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(22:4) {#if staff.mappool}",
    		ctx
    	});

    	return block;
    }

    // (25:4) {#if staff.mapper}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("🎼");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(25:4) {#if staff.mapper}",
    		ctx
    	});

    	return block;
    }

    // (28:4) {#if staff.host}
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("👑");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(28:4) {#if staff.host}",
    		ctx
    	});

    	return block;
    }

    // (31:4) {#if staff.extra}
    function create_if_block$1(ctx) {
    	let t_value = /*staff*/ ctx[0].extra + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*staff*/ 1 && t_value !== (t_value = /*staff*/ ctx[0].extra + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(31:4) {#if staff.extra}",
    		ctx
    	});

    	return block;
    }

    // (11:0) <OsuRow {link} {title} {description} {date}>
    function create_default_slot$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let if_block0 = /*staff*/ ctx[0].stream && create_if_block_6(ctx);
    	let if_block1 = /*staff*/ ctx[0].commentary && create_if_block_5(ctx);
    	let if_block2 = /*staff*/ ctx[0].referee && create_if_block_4(ctx);
    	let if_block3 = /*staff*/ ctx[0].mappool && create_if_block_3(ctx);
    	let if_block4 = /*staff*/ ctx[0].mapper && create_if_block_2(ctx);
    	let if_block5 = /*staff*/ ctx[0].host && create_if_block_1(ctx);
    	let if_block6 = /*staff*/ ctx[0].extra && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			if (if_block6) if_block6.c();
    			attr_dev(div, "class", "content svelte-1gp1dpa");
    			add_location(div, file$2, 11, 2, 326);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    			append_dev(div, t2);
    			if (if_block3) if_block3.m(div, null);
    			append_dev(div, t3);
    			if (if_block4) if_block4.m(div, null);
    			append_dev(div, t4);
    			if (if_block5) if_block5.m(div, null);
    			append_dev(div, t5);
    			if (if_block6) if_block6.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*staff*/ ctx[0].stream) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*staff*/ ctx[0].commentary) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*staff*/ ctx[0].referee) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					if_block2.m(div, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*staff*/ ctx[0].mappool) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					if_block3.m(div, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*staff*/ ctx[0].mapper) {
    				if (if_block4) ; else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(div, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*staff*/ ctx[0].host) {
    				if (if_block5) ; else {
    					if_block5 = create_if_block_1(ctx);
    					if_block5.c();
    					if_block5.m(div, t5);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*staff*/ ctx[0].extra) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block$1(ctx);
    					if_block6.c();
    					if_block6.m(div, null);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(11:0) <OsuRow {link} {title} {description} {date}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let osurow;
    	let current;

    	osurow = new OsuRow({
    			props: {
    				link: /*link*/ ctx[4],
    				title: /*title*/ ctx[1],
    				description: /*description*/ ctx[2],
    				date: /*date*/ ctx[3],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(osurow.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(osurow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const osurow_changes = {};
    			if (dirty & /*link*/ 16) osurow_changes.link = /*link*/ ctx[4];
    			if (dirty & /*title*/ 2) osurow_changes.title = /*title*/ ctx[1];
    			if (dirty & /*description*/ 4) osurow_changes.description = /*description*/ ctx[2];
    			if (dirty & /*date*/ 8) osurow_changes.date = /*date*/ ctx[3];

    			if (dirty & /*$$scope, staff*/ 33) {
    				osurow_changes.$$scope = { dirty, ctx };
    			}

    			osurow.$set(osurow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(osurow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(osurow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(osurow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let link;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Staff', slots, []);
    	let { staff } = $$props;
    	let title, description, date;

    	$$self.$$.on_mount.push(function () {
    		if (staff === undefined && !('staff' in $$props || $$self.$$.bound[$$self.$$.props['staff']])) {
    			console.warn("<Staff> was created without expected prop 'staff'");
    		}
    	});

    	const writable_props = ['staff'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Staff> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('staff' in $$props) $$invalidate(0, staff = $$props.staff);
    	};

    	$$self.$capture_state = () => ({
    		OsuRow,
    		staff,
    		title,
    		description,
    		date,
    		link
    	});

    	$$self.$inject_state = $$props => {
    		if ('staff' in $$props) $$invalidate(0, staff = $$props.staff);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('description' in $$props) $$invalidate(2, description = $$props.description);
    		if ('date' in $$props) $$invalidate(3, date = $$props.date);
    		if ('link' in $$props) $$invalidate(4, link = $$props.link);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*staff*/ 1) {
    			$$invalidate(1, title = staff.name + (staff.short ? ` (${staff.short})` : ''));
    		}

    		if ($$self.$$.dirty & /*staff*/ 1) {
    			$$invalidate(2, description = staff.description);
    		}

    		if ($$self.$$.dirty & /*staff*/ 1) {
    			$$invalidate(3, date = staff.period);
    		}

    		if ($$self.$$.dirty & /*staff*/ 1) {
    			$$invalidate(4, link = staff.link);
    		}
    	};

    	return [staff, title, description, date, link];
    }

    class Staff extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { staff: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Staff",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get staff() {
    		throw new Error("<Staff>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set staff(value) {
    		throw new Error("<Staff>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Dan.svelte generated by Svelte v3.59.1 */
    const file$1 = "src\\components\\Dan.svelte";

    // (15:2) {#if dan.v2}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Score V2";
    			attr_dev(div, "class", "v2");
    			add_location(div, file$1, 15, 4, 349);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(15:2) {#if dan.v2}",
    		ctx
    	});

    	return block;
    }

    // (11:0) <OsuRow {link} {title} {description} {date}>
    function create_default_slot$1(ctx) {
    	let div;
    	let t0_value = (/*dan*/ ctx[0].percent || 'clear!') + "";
    	let t0;
    	let t1;
    	let if_block_anchor;
    	let if_block = /*dan*/ ctx[0].v2 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(div, "class", "percent svelte-4fncym");
    			add_location(div, file$1, 11, 2, 265);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*dan*/ 1 && t0_value !== (t0_value = (/*dan*/ ctx[0].percent || 'clear!') + "")) set_data_dev(t0, t0_value);

    			if (/*dan*/ ctx[0].v2) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(11:0) <OsuRow {link} {title} {description} {date}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let osurow;
    	let current;

    	osurow = new OsuRow({
    			props: {
    				link: /*link*/ ctx[4],
    				title: /*title*/ ctx[1],
    				description: /*description*/ ctx[2],
    				date: /*date*/ ctx[3],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(osurow.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(osurow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const osurow_changes = {};
    			if (dirty & /*link*/ 16) osurow_changes.link = /*link*/ ctx[4];
    			if (dirty & /*title*/ 2) osurow_changes.title = /*title*/ ctx[1];
    			if (dirty & /*description*/ 4) osurow_changes.description = /*description*/ ctx[2];
    			if (dirty & /*date*/ 8) osurow_changes.date = /*date*/ ctx[3];

    			if (dirty & /*$$scope, dan*/ 33) {
    				osurow_changes.$$scope = { dirty, ctx };
    			}

    			osurow.$set(osurow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(osurow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(osurow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(osurow, detaching);
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
    	let link;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dan', slots, []);
    	let { dan } = $$props;
    	let title, description, date;

    	$$self.$$.on_mount.push(function () {
    		if (dan === undefined && !('dan' in $$props || $$self.$$.bound[$$self.$$.props['dan']])) {
    			console.warn("<Dan> was created without expected prop 'dan'");
    		}
    	});

    	const writable_props = ['dan'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dan> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('dan' in $$props) $$invalidate(0, dan = $$props.dan);
    	};

    	$$self.$capture_state = () => ({
    		OsuRow,
    		dan,
    		title,
    		description,
    		date,
    		link
    	});

    	$$self.$inject_state = $$props => {
    		if ('dan' in $$props) $$invalidate(0, dan = $$props.dan);
    		if ('title' in $$props) $$invalidate(1, title = $$props.title);
    		if ('description' in $$props) $$invalidate(2, description = $$props.description);
    		if ('date' in $$props) $$invalidate(3, date = $$props.date);
    		if ('link' in $$props) $$invalidate(4, link = $$props.link);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*dan*/ 1) {
    			$$invalidate(1, title = dan.name);
    		}

    		if ($$self.$$.dirty & /*dan*/ 1) {
    			$$invalidate(2, description = dan.grade);
    		}

    		if ($$self.$$.dirty & /*dan*/ 1) {
    			$$invalidate(3, date = dan.date);
    		}

    		if ($$self.$$.dirty & /*dan*/ 1) {
    			$$invalidate(4, link = dan.link);
    		}
    	};

    	return [dan, title, description, date, link];
    }

    class Dan extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { dan: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dan",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get dan() {
    		throw new Error("<Dan>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dan(value) {
    		throw new Error("<Dan>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.1 */
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (47:2) <Form bind:values={tournament}>
    function create_default_slot_2(ctx) {
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let br0;
    	let t2;
    	let input2;
    	let t3;
    	let input3;
    	let t4;
    	let br1;
    	let t5;
    	let input4;
    	let t6;
    	let input5;

    	const block = {
    		c: function create() {
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			input2 = element("input");
    			t3 = space();
    			input3 = element("input");
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			input4 = element("input");
    			t6 = space();
    			input5 = element("input");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Full name");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "class", "svelte-165qyc4");
    			add_location(input0, file, 47, 3, 1298);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Shorthand");
    			attr_dev(input1, "name", "short");
    			attr_dev(input1, "class", "svelte-165qyc4");
    			add_location(input1, file, 48, 3, 1359);
    			add_location(br0, file, 49, 3, 1421);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Description");
    			attr_dev(input2, "name", "description");
    			attr_dev(input2, "class", "svelte-165qyc4");
    			add_location(input2, file, 50, 3, 1431);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "Placement");
    			attr_dev(input3, "name", "placement");
    			attr_dev(input3, "class", "svelte-165qyc4");
    			add_location(input3, file, 51, 3, 1501);
    			add_location(br1, file, 52, 3, 1567);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "placeholder", "Total participants");
    			attr_dev(input4, "name", "participants");
    			attr_dev(input4, "class", "svelte-165qyc4");
    			add_location(input4, file, 53, 3, 1577);
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "placeholder", "Period/date");
    			attr_dev(input5, "name", "period");
    			attr_dev(input5, "class", "svelte-165qyc4");
    			add_location(input5, file, 54, 3, 1655);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, input4, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, input5, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(input5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(47:2) <Form bind:values={tournament}>",
    		ctx
    	});

    	return block;
    }

    // (60:3) {#each tournaments as tournament}
    function create_each_block_2(ctx) {
    	let tournament_1;
    	let current;

    	tournament_1 = new Tournament({
    			props: { tournament: /*tournament*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tournament_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tournament_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tournament_1_changes = {};
    			if (dirty & /*tournaments*/ 1) tournament_1_changes.tournament = /*tournament*/ ctx[3];
    			tournament_1.$set(tournament_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tournament_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tournament_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tournament_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(60:3) {#each tournaments as tournament}",
    		ctx
    	});

    	return block;
    }

    // (67:2) <Form bind:values={staff}>
    function create_default_slot_1(ctx) {
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let br0;
    	let t2;
    	let input2;
    	let t3;
    	let input3;
    	let t4;
    	let br1;
    	let t5;
    	let label0;
    	let input4;
    	let t6;
    	let t7;
    	let label1;
    	let input5;
    	let t8;
    	let t9;
    	let label2;
    	let input6;
    	let t10;
    	let t11;
    	let label3;
    	let input7;
    	let t12;
    	let t13;
    	let label4;
    	let input8;
    	let t14;
    	let t15;
    	let label5;
    	let input9;
    	let t16;
    	let t17;
    	let br2;
    	let t18;
    	let input10;

    	const block = {
    		c: function create() {
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			input2 = element("input");
    			t3 = space();
    			input3 = element("input");
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			label0 = element("label");
    			input4 = element("input");
    			t6 = text(" 📺 Stream");
    			t7 = space();
    			label1 = element("label");
    			input5 = element("input");
    			t8 = text(" 🎙️ Commentary");
    			t9 = space();
    			label2 = element("label");
    			input6 = element("input");
    			t10 = text(" 👮 Referee");
    			t11 = space();
    			label3 = element("label");
    			input7 = element("input");
    			t12 = text(" 🎶 Mappool");
    			t13 = space();
    			label4 = element("label");
    			input8 = element("input");
    			t14 = text(" 🎼 Mapper");
    			t15 = space();
    			label5 = element("label");
    			input9 = element("input");
    			t16 = text(" 👑 Host");
    			t17 = space();
    			br2 = element("br");
    			t18 = space();
    			input10 = element("input");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Full name");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "class", "svelte-165qyc4");
    			add_location(input0, file, 67, 3, 2043);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Shorthand");
    			attr_dev(input1, "name", "short");
    			attr_dev(input1, "class", "svelte-165qyc4");
    			add_location(input1, file, 68, 3, 2104);
    			add_location(br0, file, 69, 3, 2166);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Description");
    			attr_dev(input2, "name", "description");
    			attr_dev(input2, "class", "svelte-165qyc4");
    			add_location(input2, file, 70, 3, 2176);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "Period/date");
    			attr_dev(input3, "name", "period");
    			attr_dev(input3, "class", "svelte-165qyc4");
    			add_location(input3, file, 71, 3, 2246);
    			add_location(br1, file, 72, 3, 2311);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "name", "stream");
    			attr_dev(input4, "class", "svelte-165qyc4");
    			add_location(input4, file, 73, 10, 2328);
    			attr_dev(label0, "class", "svelte-165qyc4");
    			add_location(label0, file, 73, 3, 2321);
    			attr_dev(input5, "type", "checkbox");
    			attr_dev(input5, "name", "commentary");
    			attr_dev(input5, "class", "svelte-165qyc4");
    			add_location(input5, file, 74, 10, 2396);
    			attr_dev(label1, "class", "svelte-165qyc4");
    			add_location(label1, file, 74, 3, 2389);
    			attr_dev(input6, "type", "checkbox");
    			attr_dev(input6, "name", "referee");
    			attr_dev(input6, "class", "svelte-165qyc4");
    			add_location(input6, file, 75, 10, 2473);
    			attr_dev(label2, "class", "svelte-165qyc4");
    			add_location(label2, file, 75, 3, 2466);
    			attr_dev(input7, "type", "checkbox");
    			attr_dev(input7, "name", "mappool");
    			attr_dev(input7, "class", "svelte-165qyc4");
    			add_location(input7, file, 76, 10, 2543);
    			attr_dev(label3, "class", "svelte-165qyc4");
    			add_location(label3, file, 76, 3, 2536);
    			attr_dev(input8, "type", "checkbox");
    			attr_dev(input8, "name", "mapper");
    			attr_dev(input8, "class", "svelte-165qyc4");
    			add_location(input8, file, 77, 10, 2613);
    			attr_dev(label4, "class", "svelte-165qyc4");
    			add_location(label4, file, 77, 3, 2606);
    			attr_dev(input9, "type", "checkbox");
    			attr_dev(input9, "name", "host");
    			attr_dev(input9, "class", "svelte-165qyc4");
    			add_location(input9, file, 78, 10, 2681);
    			attr_dev(label5, "class", "svelte-165qyc4");
    			add_location(label5, file, 78, 3, 2674);
    			add_location(br2, file, 79, 3, 2738);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "placeholder", "Custom emojis");
    			attr_dev(input10, "name", "extra");
    			attr_dev(input10, "class", "svelte-165qyc4");
    			add_location(input10, file, 80, 3, 2748);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input4);
    			append_dev(label0, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, input5);
    			append_dev(label1, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, input6);
    			append_dev(label2, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, label3, anchor);
    			append_dev(label3, input7);
    			append_dev(label3, t12);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, label4, anchor);
    			append_dev(label4, input8);
    			append_dev(label4, t14);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, label5, anchor);
    			append_dev(label5, input9);
    			append_dev(label5, t16);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, input10, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(label2);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(label3);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(label4);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(label5);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(input10);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(67:2) <Form bind:values={staff}>",
    		ctx
    	});

    	return block;
    }

    // (86:3) {#each staffs as staff}
    function create_each_block_1(ctx) {
    	let staff_1;
    	let current;

    	staff_1 = new Staff({
    			props: { staff: /*staff*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(staff_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(staff_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const staff_1_changes = {};
    			if (dirty & /*staffs*/ 2) staff_1_changes.staff = /*staff*/ ctx[4];
    			staff_1.$set(staff_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(staff_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(staff_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(staff_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(86:3) {#each staffs as staff}",
    		ctx
    	});

    	return block;
    }

    // (94:2) <Form bind:values={dan}>
    function create_default_slot(ctx) {
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let br0;
    	let t2;
    	let input2;
    	let t3;
    	let input3;
    	let t4;
    	let br1;
    	let t5;
    	let label;
    	let input4;
    	let t6;

    	const block = {
    		c: function create() {
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			input2 = element("input");
    			t3 = space();
    			input3 = element("input");
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			label = element("label");
    			input4 = element("input");
    			t6 = text(" Score v2");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Name");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "class", "svelte-165qyc4");
    			add_location(input0, file, 94, 3, 3166);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Grade");
    			attr_dev(input1, "name", "grade");
    			attr_dev(input1, "class", "svelte-165qyc4");
    			add_location(input1, file, 95, 3, 3222);
    			add_location(br0, file, 96, 3, 3280);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Percent");
    			attr_dev(input2, "name", "percent");
    			attr_dev(input2, "class", "svelte-165qyc4");
    			add_location(input2, file, 97, 3, 3290);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "Date");
    			attr_dev(input3, "name", "date");
    			attr_dev(input3, "class", "svelte-165qyc4");
    			add_location(input3, file, 98, 3, 3352);
    			add_location(br1, file, 99, 3, 3408);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "name", "v2");
    			attr_dev(input4, "class", "svelte-165qyc4");
    			add_location(input4, file, 100, 10, 3425);
    			attr_dev(label, "class", "svelte-165qyc4");
    			add_location(label, file, 100, 3, 3418);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, label, anchor);
    			append_dev(label, input4);
    			append_dev(label, t6);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(label);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(94:2) <Form bind:values={dan}>",
    		ctx
    	});

    	return block;
    }

    // (106:3) {#each dans as dan}
    function create_each_block(ctx) {
    	let dan_1;
    	let current;

    	dan_1 = new Dan({
    			props: { dan: /*dan*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(dan_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dan_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dan_1_changes = {};
    			if (dirty & /*dans*/ 4) dan_1_changes.dan = /*dan*/ ctx[5];
    			dan_1.$set(dan_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dan_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dan_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dan_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(106:3) {#each dans as dan}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let form0;
    	let updating_values;
    	let t0;
    	let button0;
    	let t2;
    	let button1;
    	let t4;
    	let div0;
    	let t5;
    	let tournament_1;
    	let t6;
    	let br0;
    	let t7;
    	let form1;
    	let updating_values_1;
    	let t8;
    	let button2;
    	let t10;
    	let button3;
    	let t12;
    	let div1;
    	let t13;
    	let staff_1;
    	let t14;
    	let br1;
    	let t15;
    	let form2;
    	let updating_values_2;
    	let t16;
    	let button4;
    	let t18;
    	let button5;
    	let t20;
    	let div2;
    	let t21;
    	let dan_1;
    	let t22;
    	let br2;
    	let current;
    	let mounted;
    	let dispose;

    	function form0_values_binding(value) {
    		/*form0_values_binding*/ ctx[12](value);
    	}

    	let form0_props = {
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*tournament*/ ctx[3] !== void 0) {
    		form0_props.values = /*tournament*/ ctx[3];
    	}

    	form0 = new Form({ props: form0_props, $$inline: true });
    	binding_callbacks.push(() => bind(form0, 'values', form0_values_binding));
    	let each_value_2 = /*tournaments*/ ctx[0];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	tournament_1 = new Tournament({
    			props: { tournament: /*tournament*/ ctx[3] },
    			$$inline: true
    		});

    	function form1_values_binding(value) {
    		/*form1_values_binding*/ ctx[13](value);
    	}

    	let form1_props = {
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*staff*/ ctx[4] !== void 0) {
    		form1_props.values = /*staff*/ ctx[4];
    	}

    	form1 = new Form({ props: form1_props, $$inline: true });
    	binding_callbacks.push(() => bind(form1, 'values', form1_values_binding));
    	let each_value_1 = /*staffs*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	staff_1 = new Staff({
    			props: { staff: /*staff*/ ctx[4] },
    			$$inline: true
    		});

    	function form2_values_binding(value) {
    		/*form2_values_binding*/ ctx[14](value);
    	}

    	let form2_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*dan*/ ctx[5] !== void 0) {
    		form2_props.values = /*dan*/ ctx[5];
    	}

    	form2 = new Form({ props: form2_props, $$inline: true });
    	binding_callbacks.push(() => bind(form2, 'values', form2_values_binding));
    	let each_value = /*dans*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_2 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	dan_1 = new Dan({
    			props: { dan: /*dan*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			create_component(form0.$$.fragment);
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "Add tournament";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Remove last tournament";
    			t4 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t5 = space();
    			create_component(tournament_1.$$.fragment);
    			t6 = space();
    			br0 = element("br");
    			t7 = space();
    			create_component(form1.$$.fragment);
    			t8 = space();
    			button2 = element("button");
    			button2.textContent = "Add staff";
    			t10 = space();
    			button3 = element("button");
    			button3.textContent = "Remove last staff";
    			t12 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t13 = space();
    			create_component(staff_1.$$.fragment);
    			t14 = space();
    			br1 = element("br");
    			t15 = text("\n\n\t\t(you can probably use that last one for anything else, just ignore the field names)\n\t\t");
    			create_component(form2.$$.fragment);
    			t16 = space();
    			button4 = element("button");
    			button4.textContent = "Add dan";
    			t18 = space();
    			button5 = element("button");
    			button5.textContent = "Remove last dan";
    			t20 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t21 = space();
    			create_component(dan_1.$$.fragment);
    			t22 = space();
    			br2 = element("br");
    			attr_dev(button0, "class", "svelte-165qyc4");
    			add_location(button0, file, 56, 2, 1729);
    			attr_dev(button1, "class", "svelte-165qyc4");
    			add_location(button1, file, 57, 2, 1788);
    			attr_dev(div0, "id", "tournaments");
    			add_location(div0, file, 58, 2, 1858);
    			add_location(br0, file, 64, 2, 2003);
    			attr_dev(button2, "class", "svelte-165qyc4");
    			add_location(button2, file, 82, 2, 2823);
    			attr_dev(button3, "class", "svelte-165qyc4");
    			add_location(button3, file, 83, 2, 2872);
    			attr_dev(div1, "id", "staffs");
    			add_location(div1, file, 84, 2, 2932);
    			add_location(br1, file, 90, 2, 3042);
    			attr_dev(button4, "class", "svelte-165qyc4");
    			add_location(button4, file, 102, 2, 3490);
    			attr_dev(button5, "class", "svelte-165qyc4");
    			add_location(button5, file, 103, 2, 3535);
    			attr_dev(div2, "id", "dans");
    			add_location(div2, file, 104, 2, 3591);
    			add_location(br2, file, 110, 2, 3687);
    			attr_dev(div3, "class", "content svelte-165qyc4");
    			add_location(div3, file, 45, 1, 1239);
    			attr_dev(main, "class", "svelte-165qyc4");
    			add_location(main, file, 44, 0, 1231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			mount_component(form0, div3, null);
    			append_dev(div3, t0);
    			append_dev(div3, button0);
    			append_dev(div3, t2);
    			append_dev(div3, button1);
    			append_dev(div3, t4);
    			append_dev(div3, div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(div0, null);
    				}
    			}

    			append_dev(div0, t5);
    			mount_component(tournament_1, div0, null);
    			append_dev(div3, t6);
    			append_dev(div3, br0);
    			append_dev(div3, t7);
    			mount_component(form1, div3, null);
    			append_dev(div3, t8);
    			append_dev(div3, button2);
    			append_dev(div3, t10);
    			append_dev(div3, button3);
    			append_dev(div3, t12);
    			append_dev(div3, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(div1, null);
    				}
    			}

    			append_dev(div1, t13);
    			mount_component(staff_1, div1, null);
    			append_dev(div3, t14);
    			append_dev(div3, br1);
    			append_dev(div3, t15);
    			mount_component(form2, div3, null);
    			append_dev(div3, t16);
    			append_dev(div3, button4);
    			append_dev(div3, t18);
    			append_dev(div3, button5);
    			append_dev(div3, t20);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			append_dev(div2, t21);
    			mount_component(dan_1, div2, null);
    			append_dev(div3, t22);
    			append_dev(div3, br2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*addTournament*/ ctx[6], false, false, false, false),
    					listen_dev(button1, "click", /*removeTournament*/ ctx[9], false, false, false, false),
    					listen_dev(button2, "click", /*addStaff*/ ctx[7], false, false, false, false),
    					listen_dev(button3, "click", /*removeStaff*/ ctx[10], false, false, false, false),
    					listen_dev(button4, "click", /*addDan*/ ctx[8], false, false, false, false),
    					listen_dev(button5, "click", /*removeDan*/ ctx[11], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const form0_changes = {};

    			if (dirty & /*$$scope*/ 16777216) {
    				form0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_values && dirty & /*tournament*/ 8) {
    				updating_values = true;
    				form0_changes.values = /*tournament*/ ctx[3];
    				add_flush_callback(() => updating_values = false);
    			}

    			form0.$set(form0_changes);

    			if (dirty & /*tournaments*/ 1) {
    				each_value_2 = /*tournaments*/ ctx[0];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(div0, t5);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const tournament_1_changes = {};
    			if (dirty & /*tournament*/ 8) tournament_1_changes.tournament = /*tournament*/ ctx[3];
    			tournament_1.$set(tournament_1_changes);
    			const form1_changes = {};

    			if (dirty & /*$$scope*/ 16777216) {
    				form1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_values_1 && dirty & /*staff*/ 16) {
    				updating_values_1 = true;
    				form1_changes.values = /*staff*/ ctx[4];
    				add_flush_callback(() => updating_values_1 = false);
    			}

    			form1.$set(form1_changes);

    			if (dirty & /*staffs*/ 2) {
    				each_value_1 = /*staffs*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div1, t13);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			const staff_1_changes = {};
    			if (dirty & /*staff*/ 16) staff_1_changes.staff = /*staff*/ ctx[4];
    			staff_1.$set(staff_1_changes);
    			const form2_changes = {};

    			if (dirty & /*$$scope*/ 16777216) {
    				form2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_values_2 && dirty & /*dan*/ 32) {
    				updating_values_2 = true;
    				form2_changes.values = /*dan*/ ctx[5];
    				add_flush_callback(() => updating_values_2 = false);
    			}

    			form2.$set(form2_changes);

    			if (dirty & /*dans*/ 4) {
    				each_value = /*dans*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, t21);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_2(i);
    				}

    				check_outros();
    			}

    			const dan_1_changes = {};
    			if (dirty & /*dan*/ 32) dan_1_changes.dan = /*dan*/ ctx[5];
    			dan_1.$set(dan_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form0.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			transition_in(tournament_1.$$.fragment, local);
    			transition_in(form1.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			transition_in(staff_1.$$.fragment, local);
    			transition_in(form2.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(dan_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form0.$$.fragment, local);
    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			transition_out(tournament_1.$$.fragment, local);
    			transition_out(form1.$$.fragment, local);
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			transition_out(staff_1.$$.fragment, local);
    			transition_out(form2.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(dan_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(form0);
    			destroy_each(each_blocks_2, detaching);
    			destroy_component(tournament_1);
    			destroy_component(form1);
    			destroy_each(each_blocks_1, detaching);
    			destroy_component(staff_1);
    			destroy_component(form2);
    			destroy_each(each_blocks, detaching);
    			destroy_component(dan_1);
    			mounted = false;
    			run_all(dispose);
    		}
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const tournamentData = localStorage.getItem('tournaments');
    	const staffData = localStorage.getItem('staffs');
    	const danData = localStorage.getItem('dans');
    	let tournaments = tournamentData ? JSON.parse(tournamentData) : [];
    	let staffs = staffData ? JSON.parse(staffData) : [];
    	let dans = danData ? JSON.parse(danData) : [];
    	let tournament = {};
    	let staff = {};
    	let dan = {};

    	const addTournament = () => {
    		$$invalidate(0, tournaments = [...tournaments, tournament]);
    		$$invalidate(3, tournament = {});
    		localStorage.setItem('tournaments', JSON.stringify(tournaments));
    	};

    	const addStaff = () => {
    		$$invalidate(1, staffs = [...staffs, staff]);
    		$$invalidate(4, staff = {});
    		localStorage.setItem('staffs', JSON.stringify(staffs));
    	};

    	const addDan = () => {
    		$$invalidate(2, dans = [...dans, dan]);
    		$$invalidate(5, dan = {});
    		localStorage.setItem('dans', JSON.stringify(dans));
    	};

    	const removeTournament = () => {
    		$$invalidate(0, tournaments = tournaments.slice(0, -1));
    	};

    	const removeStaff = () => {
    		$$invalidate(1, staffs = staffs.slice(0, -1));
    	};

    	const removeDan = () => {
    		$$invalidate(2, dans = dans.slice(0, -1));
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function form0_values_binding(value) {
    		tournament = value;
    		$$invalidate(3, tournament);
    	}

    	function form1_values_binding(value) {
    		staff = value;
    		$$invalidate(4, staff);
    	}

    	function form2_values_binding(value) {
    		dan = value;
    		$$invalidate(5, dan);
    	}

    	$$self.$capture_state = () => ({
    		Form,
    		Tournament,
    		Staff,
    		Dan,
    		tournamentData,
    		staffData,
    		danData,
    		tournaments,
    		staffs,
    		dans,
    		tournament,
    		staff,
    		dan,
    		addTournament,
    		addStaff,
    		addDan,
    		removeTournament,
    		removeStaff,
    		removeDan
    	});

    	$$self.$inject_state = $$props => {
    		if ('tournaments' in $$props) $$invalidate(0, tournaments = $$props.tournaments);
    		if ('staffs' in $$props) $$invalidate(1, staffs = $$props.staffs);
    		if ('dans' in $$props) $$invalidate(2, dans = $$props.dans);
    		if ('tournament' in $$props) $$invalidate(3, tournament = $$props.tournament);
    		if ('staff' in $$props) $$invalidate(4, staff = $$props.staff);
    		if ('dan' in $$props) $$invalidate(5, dan = $$props.dan);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		tournaments,
    		staffs,
    		dans,
    		tournament,
    		staff,
    		dan,
    		addTournament,
    		addStaff,
    		addDan,
    		removeTournament,
    		removeStaff,
    		removeDan,
    		form0_values_binding,
    		form1_values_binding,
    		form2_values_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({ target: document.body });

    return app;

})();
//# sourceMappingURL=bundle.js.map
