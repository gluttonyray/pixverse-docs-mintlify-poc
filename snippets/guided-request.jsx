// No portal: native dialog's top layer must contain the options as well.
export const GuidedSelect = ({ name, value, options, onChange, invalid }) => {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ above: false, height: 240 })
  const wrapper = useRef(null)
  const menu = useRef(null)
  const optionIndex = options.findIndex((option) => option.value === value)
  const selected = options[optionIndex]
  const listId = `guided-list-${name}`

  useEffect(() => {
    if (!open) return
    const bounds = wrapper.current.getBoundingClientRect()
    const scrollArea = wrapper.current.closest('.guided-form-panel')
    const area = scrollArea.getBoundingClientRect()
    const below = area.bottom - bounds.bottom - 12
    const above = bounds.top - area.top - 12
    const upwards = below < 200 && above > below
    setPlacement({
      above: upwards,
      height: Math.max(80, Math.min(240, upwards ? above : below)),
    })
    const dismiss = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [open])

  useEffect(() => {
    const list = menu.current
    const option = list?.querySelector('[data-active="true"]')
    if (!open || !list || !option) return
    // Scroll only the option list to keep the surrounding form and anchor stable.
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (
      option.offsetTop + option.offsetHeight >
      list.scrollTop + list.clientHeight
    ) {
      list.scrollTop =
        option.offsetTop + option.offsetHeight - list.clientHeight
    }
  }, [active, open, placement.height])

  const choose = (index) => {
    if (options[index]) onChange(options[index].value)
    setOpen(false)
  }

  return (
    <div className="guided-select" ref={wrapper}>
      <button
        type="button"
        id={`guided-field-${name}`}
        className="guided-input guided-select-trigger"
        aria-label={name}
        role="combobox"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `guided-error-${name}` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => {
          setActive(Math.max(0, optionIndex))
          setOpen(!open)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const step = event.key === 'ArrowDown' ? 1 : -1
            setActive(
              open
                ? (active + step + options.length) % options.length
                : Math.max(0, optionIndex),
            )
            setOpen(true)
          } else if (open && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            choose(active)
          } else if (open && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault()
            setActive(event.key === 'Home' ? 0 : options.length - 1)
          } else if (event.key === 'Tab') {
            setOpen(false)
          }
        }}
      >
        <span>{selected?.label ?? `${String(value)} (choose a value)`}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div
          ref={menu}
          id={listId}
          role="listbox"
          aria-label={name}
          className={
            placement.above ? 'guided-options opens-above' : 'guided-options'
          }
          style={{ maxHeight: placement.height }}
        >
          {options.map((option, index) => (
            <div
              key={String(option.value)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === active}
              className={
                index === active ? 'guided-option is-active' : 'guided-option'
              }
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              <span aria-hidden="true">
                {option.value === value ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const GuidedField = ({
  name,
  type = 'string',
  required,
  children,
  error,
}) => (
  <div className="guided-field">
    <label htmlFor={`guided-field-${name}`}>
      <span className="guided-field-name">
        {name}
        {required && <span className="guided-required"> *</span>}
      </span>
      <code>{type}</code>
    </label>
    <div className="guided-control">
      {children}
      {error && (
        <p id={`guided-error-${name}`} className="guided-error">
          {error}
        </p>
      )}
    </div>
  </div>
)

export const GuidedFirstLastFrame = () => {
  // Mintlify evaluates named snippets individually, so rules stay in this closure.
  // Ported from src/lib/first-last-frame-rules.ts. Keep rule parity tests in tooling.
  const FRAME_MODELS = ['v6', 'c1', 'v5.6', 'v5.5', 'v5', 'v4.5', 'v4', 'v3.5']
  const FRAME_QUALITIES = ['360p', '540p', '720p', '1080p']
  const AUDIO_MODELS = new Set(['v6', 'c1', 'v5.6', 'v5.5'])
  const LEGACY_AUDIO_MODELS = new Set(['v5', 'v4.5', 'v4', 'v3.5'])
  const LEGACY_AUDIO_FIELDS = [
    'sound_effect_switch',
    'sound_effect_content',
    'lip_sync_tts_switch',
    'lip_sync_tts_content',
    'lip_sync_tts_speaker_id',
  ]
  function frameAudioMode(model) {
    if (AUDIO_MODELS.has(model)) return 'generated'
    if (LEGACY_AUDIO_MODELS.has(model)) return 'legacy'
    return null
  }
  function changeFrameModel(body, model, cachedAudio) {
    const next = { ...body }
    const mode = frameAudioMode(model)
    const fields = ['generate_audio_switch', ...LEGACY_AUDIO_FIELDS]
    for (const field of fields) {
      if (field in next) cachedAudio[field] = next[field]
      delete next[field]
    }
    const visibleFields =
      mode === 'generated'
        ? ['generate_audio_switch']
        : mode === 'legacy'
          ? LEGACY_AUDIO_FIELDS
          : []
    for (const field of visibleFields) {
      if (field in cachedAudio) next[field] = cachedAudio[field]
    }
    if (model === null) delete next.model
    else next.model = model
    return next
  }
  /** A complete JSON edit replaces the request, including hidden cached values. */
  function syncFrameAudioCache(next, cache) {
    for (const field of ['generate_audio_switch', ...LEGACY_AUDIO_FIELDS]) {
      if (field in next) cache[field] = next[field]
      else delete cache[field]
    }
  }
  function frameDurationOptions(model, quality) {
    if (model === 'v6' || model === 'c1') {
      return Array.from({ length: 15 }, (_, index) => index + 1)
    }
    if (model === 'v5.6' || model === 'v5.5') {
      return quality === '1080p' ? [5, 8] : [5, 8, 10]
    }
    if (model === 'v3.5' && quality === '1080p') return [5]
    if (FRAME_MODELS.includes(model)) {
      return [5, 8]
    }
    return []
  }
  function validateFirstLastFrameBody(body) {
    const errors = []
    const requiredText = (field) => {
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        errors.push({ field, message: 'Enter a value.', kind: 'field' })
      }
    }
    const requiredInteger = (field) => {
      if (!Number.isInteger(body[field]) || body[field] < 0) {
        errors.push({
          field,
          message: 'Enter a valid image ID.',
          kind: 'field',
        })
      }
    }
    requiredText('prompt')
    if (typeof body.prompt === 'string' && body.prompt.length > 5000) {
      errors.push({
        field: 'prompt',
        message: 'Keep the prompt within 5,000 characters.',
        kind: 'field',
      })
    }
    requiredInteger('first_frame_img')
    requiredInteger('last_frame_img')
    if (
      body.seed !== undefined &&
      (!Number.isInteger(body.seed) || body.seed < 0 || body.seed > 2147483647)
    ) {
      errors.push({
        field: 'seed',
        message: 'Use an integer from 0 to 2,147,483,647.',
        kind: 'field',
      })
    }
    if (!FRAME_MODELS.includes(body.model)) {
      errors.push({
        field: 'model',
        message: 'Choose a supported model.',
        kind: 'field',
      })
    }
    if (!FRAME_QUALITIES.includes(body.quality)) {
      errors.push({
        field: 'quality',
        message: 'Choose a supported quality.',
        kind: 'field',
      })
    }
    if (!Number.isInteger(body.duration)) {
      errors.push({
        field: 'duration',
        message: 'Choose a duration in whole seconds.',
        kind: 'field',
      })
    } else if (
      FRAME_MODELS.includes(body.model) &&
      FRAME_QUALITIES.includes(body.quality) &&
      !frameDurationOptions(body.model, body.quality).includes(body.duration)
    ) {
      errors.push({
        field: 'duration',
        message: `${String(body.model)} at ${String(body.quality)} does not support ${String(body.duration)} seconds. Choose a listed duration; your value was kept.`,
        kind: 'relation',
      })
    }
    if (
      body.generate_audio_switch !== undefined &&
      typeof body.generate_audio_switch !== 'boolean'
    ) {
      errors.push({
        field: 'generate_audio_switch',
        message: 'Use true or false.',
        kind: 'field',
      })
    } else if (
      body.generate_audio_switch !== undefined &&
      FRAME_MODELS.includes(body.model) &&
      !AUDIO_MODELS.has(body.model)
    ) {
      errors.push({
        field: 'generate_audio_switch',
        message: 'Generated audio is available on v5.5, v5.6, v6 and c1.',
        kind: 'relation',
      })
    }
    if (
      FRAME_MODELS.includes(body.model) &&
      !LEGACY_AUDIO_MODELS.has(body.model)
    ) {
      for (const field of LEGACY_AUDIO_FIELDS) {
        if (body[field] !== undefined) {
          errors.push({
            field,
            message: 'This field is only available on v5 and earlier.',
            kind: 'relation',
          })
        }
      }
    }
    for (const field of LEGACY_AUDIO_FIELDS) {
      if (body[field] !== undefined && typeof body[field] !== 'string') {
        errors.push({ field, message: 'Use a text value.', kind: 'field' })
      }
    }
    if (
      typeof body.lip_sync_tts_content === 'string' &&
      body.lip_sync_tts_content.length > 140
    ) {
      errors.push({
        field: 'lip_sync_tts_content',
        message: 'Keep speech within 140 characters.',
        kind: 'field',
      })
    }
    return errors
  }

  const parseFrameJSON = (draft) => {
    let next
    try {
      next = JSON.parse(draft)
    } catch {
      return { errors: [{ field: 'JSON', message: 'Enter valid JSON.' }] }
    }
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      return {
        errors: [{ field: 'JSON', message: 'The request must be an object.' }],
      }
    }
    return { body: next, errors: validateFirstLastFrameBody(next) }
  }

  const initialBody = {
    prompt: 'A smooth transition from the first frame to the last frame',
    model: 'v6',
    duration: 5,
    quality: '540p',
    first_frame_img: 0,
    last_frame_img: 0,
    seed: 0,
  }
  const [body, setBody] = useState(initialBody)
  const [mode, setMode] = useState('form')
  const [draft, setDraft] = useState(JSON.stringify(initialBody, null, 2))
  const [status, setStatus] = useState('')
  const [opened, setOpened] = useState(false)
  const cache = useRef({})
  const dialog = useRef(null)
  const trigger = useRef(null)
  const result =
    mode === 'json'
      ? parseFrameJSON(draft)
      : {
          body,
          errors: validateFirstLastFrameBody(body),
        }
  const errors = result.errors
  const modeAudio = frameAudioMode(body.model)
  const fieldError = (name) =>
    errors.find((error) => error.field === name)?.message

  const update = (name, value) => {
    const next = { ...body }
    if (value === undefined) delete next[name]
    else next[name] = value
    setBody(next)
    setDraft(JSON.stringify(next, null, 2))
    setStatus('')
  }

  const changeModel = (model) => {
    const next = changeFrameModel(body, model, cache.current)
    setBody(next)
    setDraft(JSON.stringify(next, null, 2))
    setStatus('')
  }

  const editJSON = (value) => {
    setDraft(value)
    setStatus('')
    const parsed = parseFrameJSON(value)
    // Invalid drafts remain editable and cannot replace the last valid request.
    if (parsed.body && parsed.errors.length === 0) {
      syncFrameAudioCache(parsed.body, cache.current)
      setBody(parsed.body)
    }
  }

  const toggleMode = () => {
    if (mode === 'json' && errors.length) {
      setStatus('Fix the JSON errors before switching to the form.')
      return
    }
    if (mode === 'form') setDraft(JSON.stringify(body, null, 2))
    setMode(mode === 'form' ? 'json' : 'form')
    setStatus('')
  }

  const preview = (event) => {
    event.preventDefault()
    if (errors.length) {
      setStatus('Fix the highlighted fields before previewing the request.')
      return
    }
    setStatus('Request validated. Preview only — no API request was sent.')
  }

  const input = (name, type = 'text') => (
    <input
      className="guided-input"
      id={`guided-field-${name}`}
      type={type}
      value={body[name] ?? ''}
      aria-invalid={Boolean(fieldError(name)) || undefined}
      aria-describedby={fieldError(name) ? `guided-error-${name}` : undefined}
      onChange={(event) =>
        update(
          name,
          event.target.value === ''
            ? undefined
            : type === 'number'
              ? Number(event.target.value)
              : event.target.value,
        )
      }
    />
  )

  const select = (name, options, onChange = (value) => update(name, value)) => (
    <GuidedSelect
      name={name}
      value={body[name]}
      options={options}
      onChange={onChange}
      invalid={Boolean(fieldError(name))}
    />
  )

  return (
    <div className="guided-request not-prose">
      <div className="guided-endpoint">
        <code>
          <span className="guided-method">POST</span>{' '}
          /openapi/v2/video/transition/generate
        </code>
        <button
          ref={trigger}
          type="button"
          className="guided-primary"
          onClick={() => {
            setOpened(true)
            dialog.current.showModal()
          }}
        >
          Try it
        </button>
      </div>
      <dialog
        ref={dialog}
        className="guided-dialog"
        aria-labelledby="guided-title"
        aria-describedby="guided-description"
        onClose={() => {
          setOpened(false)
          trigger.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current.close()
        }}
      >
        <div className="guided-dialog-shell">
          <header className="guided-dialog-header">
            <div className="guided-dialog-title">
              <span className="guided-dialog-method">POST</span>
              <h2 id="guided-title">First &amp; last frame</h2>
            </div>
            <code className="guided-dialog-path">
              <span>POST</span> /openapi/v2/video/transition/generate
            </code>
            {opened && (
              <button
                type="submit"
                form="guided-request-form"
                className="guided-primary"
              >
                Preview request
              </button>
            )}
            <button
              type="button"
              className="guided-close"
              aria-label="Close request preview"
              onClick={() => dialog.current.close()}
            >
              ×
            </button>
          </header>
          {opened && (
            <form id="guided-request-form" onSubmit={preview}>
              <div className="guided-columns">
                <section
                  className="guided-form-panel"
                  aria-label="Request parameters"
                >
                  <div className="guided-form-intro">
                    <h3>Configure request</h3>
                    <p id="guided-description">
                      Local preview only. No API request is sent.
                    </p>
                  </div>
                  <div className="guided-body">
                    <div className="guided-body-header">
                      <h3>Body</h3>
                      <button
                        type="button"
                        className="guided-text-button"
                        onClick={toggleMode}
                      >
                        {mode === 'form'
                          ? 'Open JSON Editor'
                          : 'Close JSON Editor'}
                      </button>
                    </div>
                    {mode === 'json' ? (
                      <div className="guided-editor-panel">
                        <label
                          htmlFor="guided-json"
                          className="guided-visually-hidden"
                        >
                          Request body JSON
                        </label>
                        <textarea
                          id="guided-json"
                          className="guided-editor"
                          value={draft}
                          spellCheck={false}
                          aria-invalid={errors.length > 0}
                          aria-describedby={
                            errors.length ? 'guided-json-errors' : undefined
                          }
                          onChange={(event) => editJSON(event.target.value)}
                        />
                        {errors.length > 0 && (
                          <ul
                            id="guided-json-errors"
                            className="guided-error-list"
                          >
                            {errors.map((error, index) => (
                              <li key={`${error.field}-${index}`}>
                                <code>{error.field}</code>: {error.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="guided-fields">
                        <GuidedField
                          name="prompt"
                          required
                          error={fieldError('prompt')}
                        >
                          <textarea
                            id="guided-field-prompt"
                            className="guided-input guided-prompt"
                            value={body.prompt ?? ''}
                            onChange={(event) =>
                              update('prompt', event.target.value)
                            }
                            aria-invalid={
                              Boolean(fieldError('prompt')) || undefined
                            }
                            aria-describedby={
                              fieldError('prompt')
                                ? 'guided-error-prompt'
                                : undefined
                            }
                          />
                        </GuidedField>
                        <GuidedField
                          name="model"
                          required
                          error={fieldError('model')}
                        >
                          {select(
                            'model',
                            FRAME_MODELS.map((model) => ({
                              value: model,
                              label: model,
                            })),
                            changeModel,
                          )}
                        </GuidedField>
                        <GuidedField
                          name="quality"
                          required
                          error={fieldError('quality')}
                        >
                          {select(
                            'quality',
                            FRAME_QUALITIES.map((quality) => ({
                              value: quality,
                              label: quality,
                            })),
                          )}
                        </GuidedField>
                        <GuidedField
                          name="duration"
                          type="integer"
                          required
                          error={fieldError('duration')}
                        >
                          {select(
                            'duration',
                            frameDurationOptions(body.model, body.quality).map(
                              (duration) => ({
                                value: duration,
                                label: `${duration} s`,
                              }),
                            ),
                          )}
                        </GuidedField>
                        {['first_frame_img', 'last_frame_img', 'seed'].map(
                          (name) => (
                            <GuidedField
                              key={name}
                              name={name}
                              type="integer"
                              required={name !== 'seed'}
                              error={fieldError(name)}
                            >
                              {input(name, 'number')}
                            </GuidedField>
                          ),
                        )}
                        {modeAudio === 'generated' && (
                          <GuidedField
                            name="generate_audio_switch"
                            type="boolean"
                            error={fieldError('generate_audio_switch')}
                          >
                            {select('generate_audio_switch', [
                              { value: undefined, label: 'Unset' },
                              { value: true, label: 'True' },
                              { value: false, label: 'False' },
                            ])}
                          </GuidedField>
                        )}
                        {modeAudio === 'legacy' &&
                          LEGACY_AUDIO_FIELDS.map((name) => (
                            <GuidedField
                              key={name}
                              name={name}
                              error={fieldError(name)}
                            >
                              {input(name)}
                            </GuidedField>
                          ))}
                      </div>
                    )}
                  </div>
                </section>
                <section
                  className="guided-preview-panel"
                  aria-label="Request preview"
                >
                  <div className="guided-code-header">Request JSON</div>
                  <pre className="guided-code">
                    <code>
                      {mode === 'json' ? draft : JSON.stringify(body, null, 2)}
                    </code>
                  </pre>
                </section>
              </div>
              <footer
                className="guided-status"
                role="status"
                aria-live="polite"
              >
                {status ||
                  (errors.length
                    ? `${errors.length} validation issue${errors.length === 1 ? '' : 's'} to resolve.`
                    : 'Ready to preview your request.')}
              </footer>
            </form>
          )}
        </div>
      </dialog>
    </div>
  )
}
