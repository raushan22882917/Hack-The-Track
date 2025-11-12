namespace Dreamteck {
    using System.Linq;
    using UnityEngine;

    public class Singleton<T> : PrivateSingleton<T> where T : Component {
        public static T instance {
            get {
                if (_instance == null) {
                    _instance = Object.FindObjectsByType<T>(FindObjectsSortMode.None).FirstOrDefault();
                }

                return _instance;
            }
        }
    }
}