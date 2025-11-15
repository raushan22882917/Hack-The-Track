using UnityEngine;
using UnityEngine.SceneManagement;

public class LoadBarberScene : MonoBehaviour {
    public void Load() {
        SceneManager.LoadScene("BarberScene", LoadSceneMode.Single);
    }
}
