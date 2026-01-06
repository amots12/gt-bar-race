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
    // sort by RANK (leader first)
    const sorted = [...stageData].sort(
      (a, b) => a.rank - b.rank
    );

    return {
      title: {
        text: `Tour de France ${YEAR}`,
        subtext: `General Classification — Stage ${idx + 1}`,
        left: "center"
      },

      yAxis: {
        data: sorted.map(d => d.rider)
      },

      series: [
        {
          data: sorted.map(d => d.acc_seconds)
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
      playInterval: 900,
      show: false,
      data: stages.map((_, i) => `S${i + 1}`)
    },

    grid: {
      left: 180,
      right: 60,
      top: 80,
      bottom: 40
    },

    xAxis: {
      type: "value",
      name: "Accumulated GC time (seconds)",
      max: value => value.max * 1.05,   // smooth scale, no jumps
      axisLabel: {
        formatter: v => {
          const h = Math.floor(v / 3600);
          const m = Math.floor((v % 3600) / 60);
          const s = v % 60;
          return `${h}:${String(m).padStart(2, "0")}`;
        }
      }
    },

    yAxis: {
      type: "category",
      inverse: true,
      animationDuration: 300,
      animationDurationUpdate: 300
    },

    series: [
      {
        type: "bar",
        realtimeSort: true,
        barWidth: 18,

        label: {
          show: true,
          position: "right",
          formatter: p => {
            const d = stages[
              chart.getOption().timeline[0].currentIndex
            ][p.dataIndex];

            return d.overall_time;
          }
        },

        itemStyle: {
          color: "#5470C6"
        },

        animationDuration: 800,
        animationEasing: "linear",
        animationDurationUpdate: 800
      }
    ],

    options: buildOptions(stages)
  });
});
