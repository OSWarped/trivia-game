import PoolPointSelector from './PoolPointSelector';
import WagerInput from './WagerInput';

interface RoundScoringControlsProps {
  pointSystem?: 'FIXED' | 'POOL' | null;
  isWagerRound: boolean;
  remainingPoints: number[];
  selectedPoints: number | null;
  maxWager: number;
  submitted: boolean;
  onSelectedPointsChange: (value: number | null) => void;
}

export default function RoundScoringControls({
  pointSystem,
  isWagerRound,
  remainingPoints,
  selectedPoints,
  maxWager,
  submitted,
  onSelectedPointsChange,
}: RoundScoringControlsProps) {
  return (
    <>
      {pointSystem === 'POOL' && (
        <PoolPointSelector
          remainingPoints={remainingPoints}
          selectedPoints={selectedPoints}
          disabled={submitted}
          onChange={onSelectedPointsChange}
        />
      )}

      {isWagerRound && (
        <WagerInput
          value={selectedPoints}
          maxWager={maxWager}
          disabled={submitted}
          submitted={submitted}
          onChange={onSelectedPointsChange}
        />
      )}
    </>
  );
}