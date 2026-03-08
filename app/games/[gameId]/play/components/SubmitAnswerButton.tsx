interface SubmitAnswerButtonProps {
  submitted: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function SubmitAnswerButton({
  submitted,
  disabled,
  onClick,
}: SubmitAnswerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-6 w-full rounded-lg px-5 py-3 text-center font-semibold transition ${
        submitted
          ? 'cursor-not-allowed bg-gray-400 text-gray-700'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {submitted ? 'Answer Submitted' : 'Submit Answer'}
    </button>
  );
}