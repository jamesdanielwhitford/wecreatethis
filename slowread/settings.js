const SPEED_OPTIONS = [
  { label: 'Slow',    ms: 350 },
  { label: 'Normal',  ms: 200 },
  { label: 'Fast',    ms: 100 },
  { label: 'Faster',  ms: 50  },
];

const SIZE_OPTIONS = [
  { label: 'Small',   value: 'small' },
  { label: 'Medium',  value: 'medium' },
  { label: 'Large',   value: 'large' },
  { label: 'X-Large', value: 'xlarge' },
];

const PAUSE_OPTIONS = [
  { label: 'None',   ms: 0    },
  { label: 'Short',  ms: 1000 },
  { label: 'Normal', ms: 2000 },
  { label: 'Long',   ms: 3500 },
];

const ALIGN_OPTIONS = [
  { label: 'Left',   value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right',  value: 'right' },
];

function buildOptions(containerId, options, storageKey, defaultValue, descId, descFn) {
  const container = document.getElementById(containerId);
  const current = localStorage.getItem(storageKey) || defaultValue;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'settings-option' + (String(opt.value ?? opt.ms) === String(current) ? ' selected' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      localStorage.setItem(storageKey, opt.value ?? opt.ms);
      container.querySelectorAll('.settings-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById(descId).textContent = descFn(opt);
    });
    container.appendChild(btn);
  });

  const currentOpt = options.find(o => String(o.value ?? o.ms) === String(current)) || options[0];
  document.getElementById(descId).textContent = descFn(currentOpt);
}

buildOptions(
  'speedOptions', SPEED_OPTIONS, 'slowread-speed', '200',
  'speedDesc', opt => `${opt.ms}ms per word`
);

buildOptions(
  'sizeOptions', SIZE_OPTIONS, 'slowread-fontsize', 'medium',
  'sizeDesc', opt => opt.label
);

buildOptions(
  'pauseOptions', PAUSE_OPTIONS, 'slowread-pause', '2000',
  'pauseDesc', opt => opt.ms === 0 ? 'No pause' : `${opt.ms / 1000}s pause`
);

buildOptions(
  'alignOptions', ALIGN_OPTIONS, 'slowread-align', 'center',
  'alignDesc', opt => opt.label
);
