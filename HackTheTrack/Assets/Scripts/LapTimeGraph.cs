using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(CanvasRenderer))]
public class LapTimeGraph : MaskableGraphic {
    [SerializeField] private List<float> lapTimes = new(); // store lap times in seconds
    [SerializeField] private float lineThickness = 3f;
    [SerializeField] private Color lineColor = Color.green;

    public void SetLapTimes(List<float> times) {
        lapTimes = times;
        SetVerticesDirty();
    }

    protected override void OnPopulateMesh(VertexHelper vh) {
        vh.Clear();
        if (lapTimes == null || lapTimes.Count < 2)
            return;

        float width = rectTransform.rect.width;
        float height = rectTransform.rect.height;

        float maxLapTime = Mathf.Max(lapTimes.ToArray());
        float minLapTime = Mathf.Min(lapTimes.ToArray());

        float stepX = width / (lapTimes.Count - 1);

        // Draw lines between points
        for (int i = 0; i < lapTimes.Count - 1; i++) {
            Vector2 p1 = new Vector2(i * stepX, Mathf.InverseLerp(maxLapTime, minLapTime, lapTimes[i]) * height);
            Vector2 p2 = new Vector2((i + 1) * stepX, Mathf.InverseLerp(maxLapTime, minLapTime, lapTimes[i + 1]) * height);

            DrawLine(vh, p1, p2, lineColor, lineThickness);
        }
    }

    private void DrawLine(VertexHelper vh, Vector2 p1, Vector2 p2, Color color, float thickness) {
        Vector2 dir = (p2 - p1).normalized;
        Vector2 normal = new Vector2(-dir.y, dir.x) * (thickness / 2f);

        UIVertex v = UIVertex.simpleVert;
        v.color = color;

        v.position = p1 - normal; vh.AddVert(v);
        v.position = p1 + normal; vh.AddVert(v);
        v.position = p2 + normal; vh.AddVert(v);
        v.position = p2 - normal; vh.AddVert(v);

        int idx = vh.currentVertCount;
        vh.AddTriangle(idx - 4, idx - 3, idx - 2);
        vh.AddTriangle(idx - 4, idx - 2, idx - 1);
    }

    public float ParseLapTimeToSeconds(string lapTime) {
        if (string.IsNullOrWhiteSpace(lapTime))
            return 0f;

        // Example: "1:47.909" -> split into ["1", "47.909"]
        var parts = lapTime.Trim().Split(':');
        if (parts.Length == 2) {
            if (float.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out float minutes) &&
                float.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out float seconds)) {
                return minutes * 60f + seconds;
            }
        } else if (parts.Length == 3) {
            // Handle "0:01:47.909" just in case
            if (float.TryParse(parts[0], out float hours) &&
                float.TryParse(parts[1], out float minutes) &&
                float.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out float seconds)) {
                return hours * 3600f + minutes * 60f + seconds;
            }
        }

        // Fallback: try to parse as raw seconds
        if (float.TryParse(lapTime, NumberStyles.Float, CultureInfo.InvariantCulture, out float result))
            return result;

        Debug.LogWarning($"Unrecognized lap time format: {lapTime}");
        return 0f;
    }
}
