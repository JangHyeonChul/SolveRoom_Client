// 선택지 중 하나를 고르는 버튼 묶음(라디오). 방 만들기와 방 안 주제 바꾸기에서 같이 쓴다
export default function OptionSeg<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className="seg__btn" onClick={() => onChange(o)}>
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
