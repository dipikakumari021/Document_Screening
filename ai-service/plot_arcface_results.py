import pandas as pd
import matplotlib.pyplot as plt


# ==========================================
# 1. LOAD ARCface EVALUATION RESULTS
# ==========================================

results_file = "arcface_full_pair_results.csv"
threshold_file = "arcface_full_pair_thresholds.csv"

results = pd.read_csv(results_file)
thresholds = pd.read_csv(threshold_file)

print("Results loaded successfully!")
print(f"Total comparisons: {len(results)}")


# ==========================================
# 2. GRAPH 1: FAR vs FRR
# ==========================================

plt.figure(figsize=(10, 6))

plt.plot(
    thresholds["threshold"],
    thresholds["FAR (%)"],
    marker="o",
    label="False Acceptance Rate (FAR)"
)

plt.plot(
    thresholds["threshold"],
    thresholds["FRR (%)"],
    marker="o",
    label="False Rejection Rate (FRR)"
)

# Highlight our selected threshold
selected_threshold = 0.65

selected_row = thresholds[
    thresholds["threshold"] == selected_threshold
].iloc[0]

plt.axvline(
    selected_threshold,
    linestyle="--",
    label="Selected Threshold = 0.65"
)

plt.scatter(
    [selected_threshold],
    [selected_row["FAR (%)"]],
    s=80
)

plt.scatter(
    [selected_threshold],
    [selected_row["FRR (%)"]],
    s=80
)

plt.title("ArcFace Threshold Evaluation")
plt.xlabel("Similarity Threshold")
plt.ylabel("Rate (%)")

plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()

plt.savefig(
    "arcface_threshold_evaluation.png",
    dpi=300
)

plt.show()


# ==========================================
# 3. GRAPH 2: GENUINE VS IMPOSTOR SCORES
# ==========================================

genuine = results[
    results["comparison_type"].str.lower() == "genuine"
]["similarity"]

impostor = results[
    results["comparison_type"].str.lower() == "impostor"
]["similarity"]


plt.figure(figsize=(10, 6))

plt.hist(
    genuine,
    bins=15,
    alpha=0.6,
    label="Genuine Comparisons"
)

plt.hist(
    impostor,
    bins=15,
    alpha=0.6,
    label="Impostor Comparisons"
)

# Show selected threshold
plt.axvline(
    0.65,
    linestyle="--",
    linewidth=2,
    label="Selected Threshold = 0.65"
)

plt.title("ArcFace Genuine vs Impostor Similarity Scores")
plt.xlabel("Cosine Similarity Score")
plt.ylabel("Number of Comparisons")

plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()

plt.savefig(
    "arcface_score_distribution.png",
    dpi=300
)

plt.show()


# ==========================================
# 4. PRINT IMPORTANT RESULTS
# ==========================================

print("\n========== ARCface EVALUATION ==========")

print(f"Genuine comparisons : {len(genuine)}")
print(f"Impostor comparisons: {len(impostor)}")

print(f"\nGenuine score range:")
print(f"Min = {genuine.min():.4f}")
print(f"Max = {genuine.max():.4f}")
print(f"Average = {genuine.mean():.4f}")

print(f"\nImpostor score range:")
print(f"Min = {impostor.min():.4f}")
print(f"Max = {impostor.max():.4f}")
print(f"Average = {impostor.mean():.4f}")

print("\nAt threshold 0.65:")

print(f"FAR = {selected_row['FAR (%)']:.2f}%")
print(f"FRR = {selected_row['FRR (%)']:.2f}%")

print("\nGraphs generated successfully!")