# 📄 AutoQuittance

> **Génération automatique de quittances & factures — 100% dans votre navigateur.**

<div align="center">

## 🚀 [Accéder à l'application](https://eraile.github.io/auto_quittance/)

**➡️ https://eraile.github.io/auto_quittance/ ⬅️**

*Aucune installation • Aucun compte • Vos données ne quittent jamais votre appareil*

</div>

---

## ✨ Fonctionnalités

- **Génération par lot** — Glissez-déposez plusieurs templates Word (`.docx`) ou Excel (`.xlsx`) et générez toutes vos factures en un clic
- **Variables dynamiques** — Remplacez automatiquement `{CURRENT_MONTH}`, `{CURRENT_YEAR}`, `{SENDER_NAME}` et bien d'autres dans vos documents
- **Sélection de période** — Mois précédent, actuel ou suivant en un seul clic
- **Envoi par e-mail** — Prépare un e-mail avec toutes les pièces jointes directement depuis l'app
- **Préférences mémorisées** — Nom, e-mail expéditeur et modèle de message sauvegardés localement
- **100% côté client** — Aucune donnée envoyée sur un serveur, tout reste sur votre machine

## 🖥️ Utilisation

1. Ouvrez l'application sur **[eraile.github.io/auto_quittance](https://eraile.github.io/auto_quittance/)**
2. Choisissez la **période de facturation** (mois précédent / actuel / suivant)
3. **Glissez-déposez** vos templates `.docx` dans la zone de dépôt
4. Renseignez vos **préférences** (nom, e-mail, modèle de message)
5. Cliquez sur **Générer & Télécharger** — vos factures sont prêtes !

## 🛠️ Stack technique

| Technologie | Rôle |
|---|---|
| HTML / CSS / JS vanilla | Interface & logique applicative |
| [docxtemplater](https://docxtemplater.com/) | Remplacement de variables dans les `.docx` |
| [JSZip](https://stuk.github.io/jszip/) | Manipulation des fichiers ZIP/docx côté client |

## 📁 Structure du projet

```
auto_quittance/
├── index.html       # Application principale
├── tutorial.html    # Guide d'utilisation
├── app.js           # Logique applicative (100% client-side)
├── style.css        # Styles
└── assets/          # Ressources statiques
```

## 🔒 Confidentialité

Toutes les opérations se font **localement dans votre navigateur**. Aucun fichier, aucune donnée personnelle n'est transmis à un serveur externe.

---

<div align="center">

Fait avec ❤️ • [Voir l'app en ligne](https://eraile.github.io/auto_quittance/)

</div>
