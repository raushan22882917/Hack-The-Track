using UnityEngine;
using UnityEngine.Rendering;

public class ControlFogOnCamera : MonoBehaviour {

    private void OnEnable() {
        RenderPipelineManager.beginCameraRendering += BeginRender;
        RenderPipelineManager.endCameraRendering += EndRender;
    }

    private void OnDisable() {
        RenderPipelineManager.beginCameraRendering -= BeginRender;
        RenderPipelineManager.endCameraRendering -= EndRender;
    }

    private void BeginRender(ScriptableRenderContext context, Camera camera) {
        if (camera.name == "MiniMapCamera") {
            RenderSettings.fog = false;
        }
    }

    private void EndRender(ScriptableRenderContext context, Camera camera) {
        if (camera.name == "MiniMapCamera") {
            RenderSettings.fog = true;
        }
    }
}
