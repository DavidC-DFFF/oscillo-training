# Oscilloscope — Page d’entraînement
**Auteur : David Chessa**  
Entraînement à la lecture et au réglage d’un oscilloscope : Amplitude (Um, Upp), Période (T), Fréquence (f) et Composante continue (Ucc).  
Interface simple, statique (HTML/CSS/JS), utilisable hors-ligne.

---

## 🗂 Structure
```
.
├── index.html
├── styles.css
├── script.js
└── Oscilloscope.png
```

## ▶️ Utilisation
1. Ouvrir **`index.html`** dans un navigateur récent (Chromium/Chrome/Edge/Firefox).
2. Cliquer **Easy / Medium / Hard** → un exercice est généré immédiatement.
3. Saisir la/les réponse(s) puis cliquer **Valider**.  
   La correction affiche **uniquement** la/les grandeur(s) demandées.

---

## 🎯 Notions & lectures
- **Um** : amplitude crête (V)  
- **Upp** : crête-à-crête (V)  
- **Ucc** : composante continue (offset, V)  
- **T** : période (s) — affichée explicitement comme **« Période T »**  
- **f** : fréquence (Hz)

Sélecteurs d’unités à côté de chaque champ (V/mV/µV, s/ms/µs, Hz/kHz/MHz).  
**Tolérance fixée à ±5 %** (non modifiable depuis l’UI).

---

## 🧪 Niveaux de difficulté
### Easy
- Sinusoïdal uniquement.  
- **Une seule** grandeur demandée parmi **Um**, **Ucc**, **T**.  
- Lectures sur **divisions entières** (vertical & horizontal).  
- Paramètres générés pour ne **jamais sortir de l’écran** si l’échelle est conservée.

### Medium
- Sinusoïdal uniquement.  
- **Une seule** grandeur parmi **Um**, **Ucc**, **T**, **f**.  
- Lectures au **1/5 de division** (pas de 0,2 div).

### Hard
- Sinusoïdal.  
- **Toutes** les grandeurs sont demandées (Um, Upp, Ucc, T, f).  
- Lectures au **1/5 de division**.

---

## 🎛 Commandes & interactions
- **Difficulté** : les boutons **Easy/Medium/Hard** génèrent directement un nouvel exercice.
- **Saisie & unités** : champ numérique + liste d’unités (conversion automatique en SI).
- **Validation** : bouton **Valider** → feedback (✅/❌) + **correction limitée aux grandeurs demandées**.
- **Couplage AC/DC** :  
  - Cliquer sur le **bouton AC** du visuel (hotspot) ou appuyer sur **A**.  
  - Le statut **« Couplage AC / DC »** s’affiche **dès le chargement**, même sans clic.
  - En **AC**, la composante continue est supprimée de l’affichage.
- **Réglages** :  
  - **Knob V/div** et **Knob s/div** : rotation à la souris ou au doigt (mobile).  
  - **Décalage horizontal** (bouton en bas) : **glisser** latéralement, **double-clic** pour recentrer.  
  - **Pan vertical** : molette ; **clic droit** pour recentrer verticalement.

---

## ⚙️ Détails techniques (utile si vous modifiez)
- **Hotspot AC** (coordonnées sur l’image) : dans `script.js`, ajuster si besoin  
  ```js
  const AC_BTN_X = 12.9; // % depuis la gauche
  const AC_BTN_Y = 91.6; // % depuis le haut
  const AC_BTN_R = 2.2;  // rayon en %
  ```
- **Taille de l’oscillo** : équilibrée pour garder le **même espace haut/bas** (voir `.scope` dans `styles.css`).  
  Modifier si nécessaire :
  ```css
  .scope { width: min(92vw, calc(86vh * 1.454)); }
  ```
- **Zone écran** (canvas) : variables CSS en tête de `styles.css`  
  ```
  --screen-left / --screen-top / --screen-width / --screen-height
  ```
- **Règles de génération** (dans `script.js`) :  
  - Easy → divisions **entières** (Um ∈ {1,2,3} div ; T ∈ {2,4,5,10} div).  
  - Medium/Hard → pas **0,2 div**.  
  - **Contrainte** : |Ucc| + Um ≤ ~3,6 div pour rester visible.
- **Tolérance** : fixée à `5` dans `validateExercise()`.

---

## 💡 Idées d’évolutions
- Mode **auto-génération au chargement** (ex. Easy par défaut).  
- Ajout de **bruit** (RMS), **décalage de phase**, autres formes d’onde (triangle/carré) selon niveau.  
- Export des résultats (CSV) pour suivi d’évaluations.

---

## 👤 Crédit
Projet pédagogique — **David Chessa**.  
Utilisation libre dans le cadre de l’enseignement.