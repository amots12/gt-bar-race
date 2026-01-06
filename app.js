const chart = echarts.init(document.getElementById("chart"));

const RACE = "tdf";
const YEAR = 2023;
const TOTAL_STAGES = 21;

// ==========================
// LOAD ALL STAGES
// ==========================

async function loadAllStages() {
  const stages = [];

  for (let i = 1; i <= TOTAL_STAGES; i++) {
    const s = String(i).padStart(2, "0");
    const res = await fetch(`data/${RACE}/${YEAR}/stage_${s}.json`);
    stages.push(await res.json());
  }

  return stages;
}

// ==========================
// BUILD TIMELINE OPTIONS
// ==========================

function buildOptions(stages) {
  return stages.map((stageData, idx) => {
    const sorted = [...stageData].sort(
      (a, b) => a.gap_seconds - b.gap_seconds
    );

    return {
      title: {
        text: `Tour de France ${YEAR}`,
        subtext: `After Stage ${idx + 1}`,
        left: "center"
      },

      yAxis: {
        type: "category",
        inverse: true,
        data: sorted.map(d => d.rider)
      },

      series: [
        {
          type: "bar",
          realtimeSort: true,
          data: sorted.map(d => d.gap_seconds),
          label: {
            show: true,
            position: "right",
            formatter: (p) => sorted[p.dataIndex].overall_time
          }
        }
      ]
    };
  });
}

// ==========================
// INIT
// ==========================

loadAllStages().then(stages => {
  chart.setOption({
    timeline: {
      axisType: "category",
      autoPlay: true,
      playInterval: 800,
      show: false,        // hide UI, pure animation
      data: stages.map((_, i) => `S${i + 1}`)
    },

    grid: {
      left: 160,
      right: 40,
      top: 80,
      bottom: 40
    },

    xAxis: {
      type: "value",
      name: "GC gap (seconds)",
      axisLabel: {
        formatter: v => `+${v}s`
      }
    },

    yAxis: {
      type: "category",
      inverse: true
    },

    series: [
      {
        type: "bar",
        realtimeSort: true,
        barWidth: 18,
        animationDuration: 700,
        animationEasing: "linear"
      }
    ],

    options: buildOptions(stages)
  });
});
