import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPoll, ApiError } from '../api/polls';
import { DateTimePicker } from '../components/DateTimePicker';
import { ErrorMessage } from '../components/ErrorMessage';
import { TextInput } from '../components/TextInput';
import type { CreatePollResponse } from '../types/poll';
import { getDateTimeLocalMin } from '../utils/dateTime';

interface FormErrors {
  question?: string;
  options?: string;
  optionItems?: Record<number, string>;
  expiresAt?: string;
}

export default function CreatePollPage() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOptionChange(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function handleAddOption() {
    setOptions((prev) => [...prev, '']);
  }

  function handleRemoveOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Reset all errors
    setErrors({});
    setSubmitError(null);

    // Validate
    const newErrors: FormErrors = {};

    if (!question.trim()) {
      newErrors.question = 'Question is required';
    }

    const optionItems: Record<number, string> = {};
    options.forEach((opt, i) => {
      if (!opt.trim()) {
        optionItems[i] = 'Option cannot be empty';
      }
    });
    if (Object.keys(optionItems).length > 0) {
      newErrors.optionItems = optionItems;
    }

    const nonEmptyOptions = options.filter((o) => o.trim().length > 0);
    if (nonEmptyOptions.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      newErrors.expiresAt = 'Expiration date must be in the future';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response: CreatePollResponse = await createPoll({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter((o) => o.length > 0),
        expiresAt: expiresAt ?? undefined,
      });
      const votingUrl = `${window.location.origin}/p/${response.slug}`;
      const managementUrl = `${window.location.origin}/manage/${response.managementToken}`;
      navigate('/poll-created', {
        state: {
          votingUrl,
          managementUrl,
          slug: response.slug,
          managementToken: response.managementToken,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body = err.body as Record<string, unknown> | null;
        const mapped: FormErrors = {};
        if (body && typeof body === 'object') {
          const errorsMap = body['errors'] as Record<string, string[]> | undefined;
          if (errorsMap) {
            if (errorsMap['Question']) {
              mapped.question = errorsMap['Question'][0];
            }
            if (errorsMap['Options']) {
              mapped.options = errorsMap['Options'][0];
            }
            if (errorsMap['ExpiresAt']) {
              mapped.expiresAt = errorsMap['ExpiresAt'][0];
            }
          } else if (body['title']) {
            setSubmitError(body['title'] as string);
          }
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
        }
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#f8f8f8] mb-6 tracking-tight">Create a Poll</h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* Question */}
        <div className="mb-6">
          <TextInput
            type="text"
            id="question"
            aria-label="Poll question"
            placeholder="What's on your mind?..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-3 placeholder:text-white/40 placeholder:italic"
          />
          <ErrorMessage message={errors.question} />
        </div>

        {/* Options */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Options</p>
          <div className="flex flex-col gap-3">
            {options.map((opt, index) => (
              <div key={index}>
                <div className="flex items-center gap-2">
                  {/* Option number */}
                  <span className="w-6 text-sm font-bold text-primary-400 shrink-0 text-right">
                    {index + 1}.
                  </span>
                  {/* Option input */}
                  <TextInput
                    type="text"
                    aria-label={`Option ${index + 1}`}
                    placeholder={index >= 2 ? 'What else?' : `Option #${index + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1 placeholder:text-white/40 placeholder:italic text-sm"
                  />
                  {/* Remove button */}
                  <button
                    type="button"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    className="shrink-0 w-6 h-6 flex items-center justify-center text-white/40
                      hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="ml-8">
                  <ErrorMessage message={errors.optionItems?.[index]} />
                </div>
              </div>
            ))}
          </div>

          <ErrorMessage message={errors.options} />

          {/* Add option */}
          <button
            type="button"
            onClick={handleAddOption}
            className="mt-3 ml-8 text-sm text-primary-400 hover:text-primary-300 font-medium transition"
          >
            + Add option
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            Expiration (optional)
          </p>
          <DateTimePicker
            value={expiresAt}
            onChange={setExpiresAt}
            min={getDateTimeLocalMin()}
            aria-label="Expiration date and time"
            className="w-full"
          />
          <ErrorMessage message={errors.expiresAt} />
        </div>

        {/* Submit */}
        <div className="flex justify-end mt-6">
          <div className="flex flex-col items-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold
                rounded-[var(--radius-btn)] px-5 py-2 text-sm tracking-wide
                disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
            <ErrorMessage message={submitError} />
          </div>
        </div>
      </form>
    </div>
  );
}
