import SingleAnswerControl from './SingleAnswerControl';
import MultipleChoiceControl from './MultipleChoiceControl';
import ListAnswerControl from './ListAnswerControl';
import OrderedAnswerControl from './OrderedAnswerControl';
import type {
    QuestionOption,
    QuestionOptionObject,
} from '../../hooks/usePlayBootstrap';

interface QuestionInputRendererProps {
    questionId?: string;
    questionType?: string | null;
    options?: QuestionOption[];
    orderedOptions: QuestionOptionObject[];
    answer: string | string[];
    submitted: boolean;
    onAnswerChange: (value: string | string[]) => void;
}

export default function QuestionInputRenderer({
    questionId,
    questionType,
    options,
    orderedOptions,
    answer,
    submitted,
    onAnswerChange,
}: QuestionInputRendererProps) {
    const textOptions = (options ?? []).map((opt) =>
        typeof opt === 'string' ? opt : opt.text
    );
    if (questionType === 'SINGLE') {
        return (
            <SingleAnswerControl
                value={typeof answer === 'string' ? answer : ''}
                onChange={onAnswerChange}
                disabled={submitted}
            />
        );
    }

    if (questionType === 'MULTIPLE_CHOICE') {
        return (
            <MultipleChoiceControl
                options={textOptions}
                value={Array.isArray(answer) ? answer : []}
                onChange={onAnswerChange}
                disabled={submitted}
            />
        );
    }

    if (questionType === 'LIST') {
        return (
            <ListAnswerControl
                itemCount={options?.length ?? 0}
                value={Array.isArray(answer) ? answer : []}
                onChange={onAnswerChange}
                disabled={submitted}
            />
        );
    }

    if (questionType === 'ORDERED') {
        return (
            <OrderedAnswerControl
                questionKey={questionId}
                options={orderedOptions}
                onChange={onAnswerChange}
            />
        );
    }

    return null;
}