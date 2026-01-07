/**
 * Tour de France 2023 – GC Bar Chart Race
 * =====================================
 *
 * This file implements a single, continuous horizontal bar chart race
 * using Apache ECharts and the timeline component.
 *
 * The chart is created ONCE and animated via timeline frames.
 *
 * -------------------------------------------------------------
 * SENIOR-LEVEL ASSUMPTIONS (EXPLICIT)
 * -------------------------------------------------------------
 * 1. We animate ONLY stage_01.json → stage_20.json
 *    - final_gc.json is excluded from animation (optional static use)
 * 2. We visualize the TOP_N riders per stage for editorial clarity
 * 3. Rank is authoritative and provided by the backend
 * 4. gc_seconds is absolute and comparable across all stages
 */

const DATA_DIR = "data/tdf/2023/";
const FIRST_STAGE = 1;
const LAST_STAGE = 20;
const TOP_N = 10;

/**
 * Utility: stage number → filename
 * Ensures correct zero-padding (stage_01.json)
 */
function stageFile(stage) {
  return `stage_${String(stage).padStart(2, "0")}.json`;
}

/**
 * -------------------------------------------------------------
 * DATA LOADING STRATEGY
 * -------------------------------------------------------------
 * - All stages are fetched in parallel
 * - No incremental loading (prevents jitter)
 * - Timeline frames are built only AFTER all data is available
 */
async function loadStages() {
  const requests = [];

  for (let i = FIRST_STAGE; i <= LAST_STAGE; i++) {
    requests.push(
      fetch(DATA_DIR + stageFile(i)).then(r => r.json())
    );
  }

  return Promise.all(requests);
}

/**
 * -------------------------------------------------------------
 * GLOBAL AXIS CALCULATION (CRITICAL)
 * -------------------------------------------------------------
 * - Compute the MAX gc_seconds across ALL stages ONCE
 * - X-axis is fixed and NEVER changes during animation
 * - Prevents axis jumping or rescaling artifacts
 */
function computeGlobalMax(stages) {
  let max = 0;

  stages.forEach(stage => {
    stage.gc.forEach(rider => {
      if (rider.gc_seconds > max) {
        max = rider.gc_seconds;
      }
    });
  });

  // Add small editorial headroom so bars never hit the edge
  return Math.ceil(max * 1.05);
}

/**
 * -------------------------------------------------------------
 * STAGE → SERIES DATA TRANSFORMATION
 * -------------------------------------------------------------
 * IMPORTANT:
 * - NO manual sorting (realtimeSort handles it)
 * - Rank is used ONLY for styling (leader highlight)
 * - Missing riders simply disappear (no ghost bars)
 */
function stageToSeriesData(stage) {
  return stage.gc
    .filter(r => r.rank <= TOP_N)
    .map(r => ({
      name: r.rider,
      value: r.gc_seconds,
      gc_time: r.gc_time,
      itemStyle: {
        color: r.rank === 1 ? "#FFD700" : "#9E9E9E"
      },
      label: {
        show: true,
        position: "right",
        formatter: r.gc_time
      }
    }));
}

/**
 * -------------------------------------------------------------
 * TIMELINE OPTIONS
 * -------------------------------------------------------------
 * Each timeline frame updates ONLY the series data.
 * The chart instance, axes, and layout remain untouched.
 */
function buildTimelineOptions(stages) {
  return stages.map(stage => ({
    title: {
      text: `Tour de France 2023 – Stage ${stage.stage}`,
      left: "center",
      top: 10
    },
    series: [
      {
        data: stageToSeriesData(stage)
      }
    ]
  }));
}

/**
 * -------------------------------------------------------------
 * CHART INITIALIZATION
 * -------------------------------------------------------------
 */
async function init() {
  const chartEl = document.getElementById("chart");
  const chart = echarts.init(chartEl);

  // Load all stage data
  const stages = await loadStages();

  // Compute global x-axis scale ONCE
  const globalMax = computeGlobalMax(stages);

  /**
   * BASE OPTION
   * - Static configuration
   * - Applied once
   */
  const baseOption = {
    animationDurationUpdate: 800,
    animationEasing: "linear",

    grid: {
      left: 220,     // Fixed padding for long rider names
      right: 100,
      top: 70,
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
      inverse: true,        // Rank 1 at top
      realtimeSort: true,  // ECharts handles ordering
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        fontSize: 12
      }
    },

    series: [
      {
        type: "bar",
        barCategoryGap: "30%",
        encode: {
          x: "value",
          y: "name"
        },
        label: {
          show: true,
          position: "right"
        }
      }
    ],

    timeline: {
      axisType: "category",
      autoPlay: true,
      playInterval: 1200,
      show: false,   // Timeline UI hidden by design
      data: stages.map(s => `Stage ${s.stage}`)
    }
  };

  /**
   * FULL OPTION
   * - baseOption + per-stage timeline frames
   */
  const option = {
    baseOption,
    options: buildTimelineOptions(stages)
  };

  chart.setOption(option);
}

// Bootstrap
init();
