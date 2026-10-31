import {
  generateFlowchartDiagram,
  getPresetFlowcharts
} from "../services/flowchartService.js";

export const generateFlowchartHandler = async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { prompt, orientation = "TD", detailLevel = "comprehensive" } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required to generate a flowchart" });
    }

    const result = await generateFlowchartDiagram(workspaceId, prompt.trim(), {
      orientation,
      detailLevel
    });

    res.json(result);
  } catch (err) {
    console.error("generateFlowchartHandler error:", err);
    res.status(500).json({ error: err.message || "Failed to generate architectural flowchart" });
  }
};

export const getPresetsHandler = (req, res) => {
  try {
    const presets = getPresetFlowcharts();
    res.json({ success: true, presets });
  } catch (err) {
    console.error("getPresetsHandler error:", err);
    res.status(500).json({ error: err.message });
  }
};
