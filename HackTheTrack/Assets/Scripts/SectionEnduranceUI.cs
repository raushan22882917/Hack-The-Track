using UnityEngine;
using UnityEngine.UI;

public class SectionEnduranceUI : MonoBehaviour {
    [SerializeField] private GameObject sectionEndurancePanel;

    private void Start() {
        sectionEndurancePanel.gameObject.SetActive(false);
    }

    public void ToggleVisibility(bool visible) {
        sectionEndurancePanel.gameObject.SetActive(visible);
    }
}
