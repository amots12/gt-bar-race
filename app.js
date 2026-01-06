const chartDom = document.getElementById("chart");
const chart = echarts.init(chartDom);

// ==========================
// CONFIG
// ==========================

const RACE = "tdf";
const YEAR = 2023;
const TOTAL_STAGES = 21;
const FRAME_DURATION = 900; // ms between stages

let currentStage = 1;
let timer = null;

// ==========================
// DATA LOADING
// ==========================

async function loadStage(stage) {
  const stageStr = String(stage).padStart(2, "0");
  const url = `data/${RACE}/${YEAR}/stage_${stageStr}.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return res.json();
}

// ==========================
// CHART RENDERING
// ==========================

function render(stageData, stageNumber) {
  // Sort by gap seconds (ascending)
  const sorted = [...stageData].sort(
    (a, b) => a.gap_seconds - b.gap_seconds
  );

  chart.setOption({
    title: {
      text: `Tour de France ${YEAR} — Stage ${stageNumber}`,
      left: "center",
      top: 10
    },

    grid: {
      left: 160,
      right: 40,
      top: 80,
      bottom: 40
    },

    xAxis: {
      type: "value",
      name: "Time gap (seconds)",
      axisLabel: {
        formatter: (v) => `+${v}s`
      }
    },

    yAxis: {
      type: "category",
      inverse: true,
      data: sorted.map(d => d.rider),
      axisLabel: {
        fontSize: 12
      }
    },

    series: [
      {
        type: "bar",
        data: sorted.map(d => d.gap_seconds),
        realtimeSort: true,
        barWidth: 18,

        label: {
          show: true,
          position: "right",
          formatter: (p) => {
            const d = sorted[p.dataIndex];
            return `${d.overall_time}`;
          }
        },

        itemStyle: {
          color: "#5470C6"
        },

        animationDuration: FRAME_DURATION * 0.8,
        animationEasing: "linear"
      }
    ]
  });
}

// ==========================
// ANIMATION LOOP
// ==========================

async function play() {
  if (timer) return;

  timer = setInterval(async () => {
    try {
      const data = await loadStage(currentStage);
      render(data, currentStage);

      currentStage++;

      if (currentStage > TOTAL_STAGES) {
        stop();
      }
    } catch (err) {
      console.error(err);
      stop();
    }
  }, FRAME_DURATION);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

// ==========================
// INIT
// ==========================

// Load first stage immediately
loadStage(1).then(data => render(data, 1));

// Start animation automatically
setTimeout(play, 1200);
