/**
 * Tour de France 2023 – GC Bar Chart Race
 * =====================================
 * Enhancements:
 * - Rider names rendered inside bars
 * - Team-based color coding
 * - Stage metadata (day counter)
 */

const DATA_DIR = "data/tdf/2023/";
const FIRST_STAGE = 1;
const LAST_STAGE = 20;
const TOP_N = 10;

/**
 * Utility: stage number → filename
 */
function stageFile(stage) {
  return `stage_${String(stage).padStart(2, "0")}.json`;
}

/**
 * -------------------------------------------------------------
 * DATA LOADING
 * -------------------------------------------------------------
 * Load:
 * - stage GC snapshots
 * - stage metadata (day counter)
 */
async function loadData() {
  const stageRequests = [];
  for (let i = FIRST_STAGE; i <= LAST_STAGE; i++) {
    stageRequests.push(
      fetch(DATA_DIR + stageFile(i)).then(r => r.json())
    );
  }

  const [stages, meta] = await Promise.all([
    Promise.all(stageRequests),
    fetch(DATA_DIR + "stages_meta.json").then(r => r.json())
  ]);

  return { stages, meta };
}

/**
 * -------------------------------------------------------------
 * GLOBAL X-AXIS MAX (ONCE)
 * -------------------------------------------------------------
 */
function computeGlobalMax(stages) {
  let max = 0;
  stages.forEach(stage => {
    stage.gc.forEach(r => {
      if (r.gc_seconds > max) max = r.gc_seconds;
    });
  });
  return Math.ceil(max * 1.05);
}

/**
 * -------------------------------------------------------------
 * TEAM COLOR PALETTE
 * -------------------------------------------------------------
 * Deterministic color assignment per team.
 * Leader jersey always overrides.
 */
const TEAM_COLORS = {};
const PALETTE = [
  "#4E79A7", "#59A14F", "#E15759", "#76B7B2",
  "#F28E2B", "#EDC948", "#B07AA1", "#FF9DA7"
];

function teamColor(team) {
  if (!TEAM_COLORS[team]) {
    TEAM_COLORS[team] = PALETTE[Object.keys(TEAM_COLORS).length % PALETTE.length];
  }
  return TEAM_COLORS[team];
}

/**
 * -------------------------------------------------------------
 * STAGE → SERIES DATA
 * -------------------------------------------------------------
 * - Rider name inside bar (left)
 * - GC time on right
 * - Team-based colors
 */
function stageToSeries(stage) {
  return stage.gc
    .filter(r => r.rank <= TOP_N)
    .map(r => ({
      name: r.rider,
      value: r.gc_seconds,
      itemStyle: {
        color: r.rank === 1 ? "#FFD700" : teamColor(r.team)
      },
      label: {
        show: true,
        position: "insideLeft",
        formatter: r.rider,
        color: "#fff",
        fontWeight: "bold"
      },
      emphasis: { disabled: true }
    }));
}

/**
 * -------------------------------------------------------------
 * TIMELINE FRAMES
 * -------------------------------------------------------------
 */
function buildTimelineOptions(stages, meta) {
  return stages.map(stage => {
    const stageMeta = meta.find(m => m.stage === stage.stage);

    return {
      title: [
        {
          text: `Tour de France 2023 – Stage ${stage.stage}`,
          left: "center",
          top: 10
        },
        {
          text: stageMeta ? `Day ${stageMeta.day}` : "",
          left: "center",
          top: 35,
          textStyle: {
            fontSize: 12,
            color: "#666"
          }
        }
      ],
      series: [
        {
          data: stageToSeries(stage),
          labelLayout: { hideOverlap: true }
        }
      ]
    };
  });
}

/**
 * -------------------------------------------------------------
 * INIT CHART
 * -------------------------------------------------------------
 */
async function init() {
  const chart = echarts.init(document.getElementById("chart"));
  const { stages, meta } = await loadData();
  const globalMax = computeGlobalMax(stages);

  const baseOption = {
    animationDurationUpdate: 900,
    animationEasing: "linear",

    grid: {
      left: 220,
      right: 120,
      top: 80,
      bottom: 40
    },

    xAxis: {
      type: "value",
      max: globalMax,
      axisLabel: { show: false },
      splitLine: { show: false }
    },

    yAxis: {
      type: "category",
      inverse: true,
      realtimeSort: true,
      axisTick: { show: false },
      axisLine: { show: false }
    },

    series: [
      {
        type: "bar",
        barCategoryGap: "30%",
        encode: { x: "value", y: "name" },
        label: {
          show: true
        }
      }
    ],

    timeline: {
      axisType: "category",
      autoPlay: true,
      playInterval: 1200,
      show: false,
      data: stages.map(s => `Stage ${s.stage}`)
    }
  };

  chart.setOption({
    baseOption,
    options: buildTimelineOptions(stages, meta)
  });
}

init();
