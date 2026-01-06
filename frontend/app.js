const chart = echarts.init(document.getElementById("chart"));
const stageSelect = document.getElementById("stageSelect");

const RACE = "tdf";
const YEAR = "2023";
const TOTAL_STAGES = 21;

for (let i = 1; i <= TOTAL_STAGES; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.text = `Stage ${i}`;
  stageSelect.appendChild(option);
}

stageSelect.addEventListener("change", e => {
  loadStage(e.target.value);
});

function loadStage(stageNumber) {
  fetch(`../data/${RACE}/${YEAR}/stage_${String(stageNumber).padStart(2, "0")}.json`)
    .then(res => res.json())
    .then(renderStage);
}

function renderStage(stageData) {
  stageData.sort((a, b) => a.rank - b.rank);

  chart.setOption({
    title: {
      text: `Stage ${stageData[0].stage} – ${stageData[0].stage_finish}`,
      subtext: `${stageData[0].stage_date} · ${stageData[0].stage_distance_km} km · ${stageData[0].stage_profile}`,
      left: "center"
    },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      inverse: true,
      data: stageData.map(d => d.rider)
    },
    series: [{
      type: "bar",
      data: stageData.map(d => d.gap_seconds),
      label: {
        show: true,
        position: "right",
        formatter: p => stageData[p.dataIndex].overall_time
      }
    }]
  });
}

// Load stage 1 by default
loadStage(1);
