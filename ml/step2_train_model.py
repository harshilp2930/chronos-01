"""
step2_train_model.py
====================
Trains the hybrid RF model on real-distribution labelled data,
evaluates it, and compares against the original synthetic baseline.

Run after step1_generate_data.py
Output → ml/hybrid_model.pkl, ml/reports/comparison_report.png
"""

import pickle
import warnings
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import pandas as pd
import seaborn as sns
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, average_precision_score, classification_report,
    confusion_matrix, f1_score, precision_score, recall_score,
    roc_auc_score, roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_PATH = SCRIPT_DIR / "data" / "weather_labelled.csv"
MODEL_PATH = SCRIPT_DIR / "hybrid_model.pkl"
REPORTS_DIR = SCRIPT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

FEATURE_COLS = [
    "wind_speed_kmh", "wind_gust_kmh", "visibility_km",
    "cloud_ceiling_ft", "temperature_c", "precipitation_mm_h",
    "lightning_distance_km", "humidity_pct",
]

# ── Colours ───────────────────────────────────────────────────────────────────
DARK   = "#0f1117"
CARD   = "#1a1d27"
ACCENT = "#4f8ef7"
GREEN  = "#22c55e"
RED    = "#ef4444"
AMBER  = "#f59e0b"
PURPLE = "#a855f7"
TEXT   = "#e2e8f0"
MUTED  = "#64748b"


def card_ax(ax):
    ax.set_facecolor(CARD)
    for sp in ax.spines.values():
        sp.set_edgecolor("#2d3147")
    ax.tick_params(colors=TEXT, labelsize=9)
    ax.xaxis.label.set_color(TEXT)
    ax.yaxis.label.set_color(TEXT)
    ax.title.set_color(TEXT)


# ── Baseline: original synthetic model ───────────────────────────────────────

def build_synthetic_baseline():
    rng = np.random.default_rng(42)
    n = 4000
    wind_speed    = rng.weibull(2.0, n) * 18.0
    wind_gust     = wind_speed * rng.uniform(1.0, 1.6, n)
    visibility    = np.clip(rng.normal(20, 10, n), 0.1, 60.0)
    cloud_ceiling = np.clip(rng.exponential(4000, n), 0, 30000)
    temperature   = rng.normal(27, 7, n)
    precip        = np.clip(rng.exponential(1.2, n), 0, 50)
    lightning     = rng.exponential(50, n)
    humidity      = np.clip(rng.normal(70, 15, n), 10, 100)
    X = np.column_stack([wind_speed, wind_gust, visibility, cloud_ceiling,
                         temperature, precip, lightning, humidity])
    wind_risk      = (wind_speed > 50) | (wind_gust > 70)
    vis_risk       = visibility < 5
    ceiling_risk   = cloud_ceiling < 2500
    precip_risk    = precip > 3.0
    lightning_risk = lightning < 10
    soft_risk = (
        (wind_speed > 35).astype(int)
        + (precip > 1.0).astype(int)
        + (visibility < 10).astype(int)
        + (cloud_ceiling < 5000).astype(int)
        + (humidity > 85).astype(int)
    ) >= 3
    y = (wind_risk | vis_risk | ceiling_risk | precip_risk | lightning_risk | soft_risk).astype(int)
    noise_idx = rng.choice(n, size=int(0.05 * n), replace=False)
    y[noise_idx] ^= 1
    return X, y


def train_model(X_train, y_train):
    scaler = StandardScaler()
    X_s = scaler.fit_transform(X_train)
    clf = RandomForestClassifier(
        n_estimators=250, max_depth=14, min_samples_leaf=3,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    clf.fit(X_s, y_train)
    return clf, scaler


def evaluate(clf, scaler, X_test, y_test, label="Model"):
    X_s = scaler.transform(X_test)
    y_pred  = clf.predict(X_s)
    y_proba = clf.predict_proba(X_s)[:, 1]
    acc  = accuracy_score(y_test, y_pred)
    auc  = roc_auc_score(y_test, y_proba)
    ap   = average_precision_score(y_test, y_proba)
    f1   = f1_score(y_test, y_pred, average="macro")
    prec = precision_score(y_test, y_pred, average="macro")
    rec  = recall_score(y_test, y_pred, average="macro")
    print(f"\n── {label} ──────────────────────────────────")
    print(f"  Accuracy : {acc*100:.2f}%")
    print(f"  ROC-AUC  : {auc:.4f}")
    print(f"  Avg Prec : {ap:.4f}")
    print(f"  F1 Macro : {f1:.4f}")
    print(classification_report(y_test, y_pred, target_names=["No-Scrub","Scrub"]))
    return dict(acc=acc, auc=auc, ap=ap, f1=f1, prec=prec, rec=rec,
                y_pred=y_pred, y_proba=y_proba, cm=confusion_matrix(y_test, y_pred),
                fpr=roc_curve(y_test, y_proba)[0], tpr=roc_curve(y_test, y_proba)[1])


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # ── Load hybrid data ──────────────────────────────────────────────────────
    df = pd.read_csv(DATA_PATH)
    X_hyb = df[FEATURE_COLS].values
    y_hyb = df["scrub_label"].values

    X_tr_h, X_te_h, y_tr_h, y_te_h = train_test_split(
        X_hyb, y_hyb, test_size=0.2, random_state=42, stratify=y_hyb)

    print("Training HYBRID model...")
    clf_h, sc_h = train_model(X_tr_h, y_tr_h)
    res_h = evaluate(clf_h, sc_h, X_te_h, y_te_h, "HYBRID MODEL")

    # 5-fold CV
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_h = cross_val_score(clf_h, sc_h.transform(X_hyb), y_hyb,
                           cv=cv, scoring="roc_auc", n_jobs=-1)
    print(f"  CV AUC: {cv_h.mean():.4f} ± {cv_h.std():.4f}")

    # ── Baseline synthetic model ──────────────────────────────────────────────
    X_syn, y_syn = build_synthetic_baseline()
    X_tr_s, X_te_s, y_tr_s, y_te_s = train_test_split(
        X_syn, y_syn, test_size=0.2, random_state=42, stratify=y_syn)

    print("\nTraining BASELINE (synthetic) model...")
    clf_s, sc_s = train_model(X_tr_s, y_tr_s)
    res_s = evaluate(clf_s, sc_s, X_te_s, y_te_s, "BASELINE MODEL")

    cv_s = cross_val_score(clf_s, sc_s.transform(X_syn), y_syn,
                           cv=cv, scoring="roc_auc", n_jobs=-1)

    # ── Save hybrid model ─────────────────────────────────────────────────────
    with MODEL_PATH.open("wb") as f:
        pickle.dump({"model": clf_h, "scaler": sc_h,
                     "features": FEATURE_COLS}, f)
    print(f"\nHybrid model saved → {MODEL_PATH}")

    # ── Plot comparison report ────────────────────────────────────────────────
    fig = plt.figure(figsize=(18, 12))
    fig.patch.set_facecolor(DARK)
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.42, wspace=0.36)

    # 1. ROC comparison
    ax1 = fig.add_subplot(gs[0, 0])
    card_ax(ax1)
    ax1.plot(res_h["fpr"], res_h["tpr"], color=ACCENT, lw=2.5,
             label=f"Hybrid  AUC={res_h['auc']:.4f}")
    ax1.plot(res_s["fpr"], res_s["tpr"], color=AMBER, lw=2,
             linestyle="--", label=f"Baseline AUC={res_s['auc']:.4f}")
    ax1.plot([0,1],[0,1], color=MUTED, lw=1, linestyle=":")
    ax1.fill_between(res_h["fpr"], res_h["tpr"], alpha=0.08, color=ACCENT)
    ax1.set_title("ROC Curve Comparison", fontsize=12, fontweight="bold")
    ax1.set_xlabel("False Positive Rate"); ax1.set_ylabel("True Positive Rate")
    ax1.legend(facecolor=CARD, edgecolor=MUTED, labelcolor=TEXT, fontsize=9)
    ax1.grid(alpha=0.12, color=MUTED)

    # 2. Confusion matrix — Hybrid
    ax2 = fig.add_subplot(gs[0, 1])
    card_ax(ax2)
    cm_pct = res_h["cm"].astype(float) / res_h["cm"].sum(axis=1, keepdims=True) * 100
    sns.heatmap(cm_pct, annot=True, fmt=".1f", ax=ax2, cmap="Blues",
                linewidths=1, linecolor="#2d3147", cbar=False,
                xticklabels=["No-Scrub","Scrub"],
                yticklabels=["No-Scrub","Scrub"],
                annot_kws={"size":13,"weight":"bold","color":"white"})
    ax2.set_title("Hybrid Model — Confusion Matrix (%)", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Predicted"); ax2.set_ylabel("Actual")

    # 3. Feature importance — Hybrid
    ax3 = fig.add_subplot(gs[0, 2])
    card_ax(ax3)
    imp = clf_h.feature_importances_
    idx = np.argsort(imp)
    colors = [ACCENT if i == idx[-1] else "#3b6fd4" for i in range(len(imp))]
    ax3.barh([FEATURE_COLS[i] for i in idx], imp[idx],
             color=[colors[i] for i in idx], edgecolor="none", height=0.65)
    for i, v in zip(idx, imp[idx]):
        ax3.text(v + 0.002, list(idx).index(i), f"{v:.3f}",
                 va="center", color=TEXT, fontsize=8.5)
    ax3.set_title("Hybrid Feature Importance", fontsize=12, fontweight="bold")
    ax3.set_xlabel("Gini Importance")
    ax3.grid(axis="x", alpha=0.12, color=MUTED)
    ax3.set_xlim([0, imp.max() * 1.2])

    # 4. Metric bar comparison
    ax4 = fig.add_subplot(gs[1, :2])
    card_ax(ax4)
    metrics = ["Accuracy", "ROC-AUC", "Avg Precision", "F1 Macro", "Precision", "Recall"]
    h_vals  = [res_h["acc"], res_h["auc"], res_h["ap"], res_h["f1"], res_h["prec"], res_h["rec"]]
    s_vals  = [res_s["acc"], res_s["auc"], res_s["ap"], res_s["f1"], res_s["prec"], res_s["rec"]]
    x = np.arange(len(metrics))
    w = 0.35
    b1 = ax4.bar(x - w/2, h_vals, w, label="Hybrid",   color=ACCENT, alpha=0.92, edgecolor="none")
    b2 = ax4.bar(x + w/2, s_vals, w, label="Baseline", color=AMBER,  alpha=0.92, edgecolor="none")
    ax4.set_xticks(x); ax4.set_xticklabels(metrics, fontsize=10)
    ax4.set_ylim([0.80, 1.02])
    ax4.set_title("Hybrid vs Baseline — All Metrics", fontsize=12, fontweight="bold")
    ax4.legend(facecolor=CARD, edgecolor=MUTED, labelcolor=TEXT, fontsize=10)
    ax4.grid(axis="y", alpha=0.12, color=MUTED)
    for bar, val in zip(b1, h_vals):
        ax4.text(bar.get_x()+bar.get_width()/2, val+0.003, f"{val:.3f}",
                 ha="center", color=TEXT, fontsize=8, fontweight="bold")
    for bar, val in zip(b2, s_vals):
        ax4.text(bar.get_x()+bar.get_width()/2, val+0.003, f"{val:.3f}",
                 ha="center", color=AMBER, fontsize=8)

    # 5. Scorecard
    ax5 = fig.add_subplot(gs[1, 2])
    ax5.set_facecolor(CARD); ax5.axis("off")
    ax5.set_title("Scorecard", fontsize=12, fontweight="bold", color=TEXT, pad=10)
    rows = [
        ("",              "Hybrid",               "Baseline"),
        ("Accuracy",      f"{res_h['acc']*100:.2f}%",  f"{res_s['acc']*100:.2f}%"),
        ("ROC-AUC",       f"{res_h['auc']:.4f}",       f"{res_s['auc']:.4f}"),
        ("Avg Precision", f"{res_h['ap']:.4f}",        f"{res_s['ap']:.4f}"),
        ("F1 Macro",      f"{res_h['f1']:.4f}",        f"{res_s['f1']:.4f}"),
        ("CV AUC Mean",   f"{cv_h.mean():.4f}",        f"{cv_s.mean():.4f}"),
        ("CV AUC Std",    f"±{cv_h.std():.4f}",       f"±{cv_s.std():.4f}"),
        ("Train rows",    f"{len(X_tr_h):,}",          f"{len(X_tr_s):,}"),
    ]
    for i, row in enumerate(rows):
        y_pos = 0.94 - i * 0.115
        label, h_val, s_val = row
        ax5.text(0.02, y_pos, label, transform=ax5.transAxes, color=MUTED, fontsize=9.5)
        c_h = ACCENT if i > 0 else TEXT
        c_s = AMBER  if i > 0 else TEXT
        ax5.text(0.62, y_pos, h_val, transform=ax5.transAxes, color=c_h,
                 fontsize=10, fontweight="bold", ha="right")
        ax5.text(0.98, y_pos, s_val, transform=ax5.transAxes, color=c_s,
                 fontsize=10, ha="right")
        if i == 0:
            ax5.plot([0.02, 0.98], [y_pos-0.04, y_pos-0.04],
                     color="#2d3147", lw=1, transform=ax5.transAxes, clip_on=False)

    fig.suptitle("ISRO Launch Scrub Risk — Hybrid vs Baseline Model Comparison",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.99)

    out = REPORTS_DIR / "comparison_report.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=DARK)
    print(f"Report saved → {out}")
    print("\n✓ All done! Run step3_predict.py to make real predictions.")
