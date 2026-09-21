import pandas as pd
import matplotlib.pyplot as plt


# ==========================================
# LOAD ACTUAL ARCFACE RESULTS
# ==========================================

results = pd.read_csv("arcface_full_pair_results.csv")

print("Results loaded!")
print("Total comparisons:", len(results))


# ==========================================
# KEEP ONLY VALID COMPARISONS
# ==========================================

valid_results = results[
    results["status"].str.lower() == "valid"
]


# Genuine comparisons
genuine = valid_results[
    valid_results["type"].str.lower() == "genuine"
]["similarity"]


# Impostor comparisons
impostor = valid_results[
    valid_results["type"].str.lower() == "impostor"
]["similarity"]


print("Valid genuine comparisons :", len(genuine))
print("Valid impostor comparisons:", len(impostor))


# ==========================================
# PRINT SCORE STATISTICS
# ==========================================

print("\nGenuine scores:")
print(f"Minimum : {genuine.min():.4f}")
print(f"Maximum : {genuine.max():.4f}")
print(f"Average : {genuine.mean():.4f}")


print("\nImpostor scores:")
print(f"Minimum : {impostor.min():.4f}")
print(f"Maximum : {impostor.max():.4f}")
print(f"Average : {impostor.mean():.4f}")


# ==========================================
# GRAPH 2
# ==========================================

plt.figure(figsize=(10, 6))


plt.hist(
    genuine,
    bins=12,
    alpha=0.65,
    label="Genuine Comparisons"
)


plt.hist(
    impostor,
    bins=12,
    alpha=0.65,
    label="Impostor Comparisons"
)


# Selected threshold
plt.axvline(
    0.65,
    linestyle="--",
    linewidth=2,
    label="Selected Threshold = 0.65"
)


plt.title("ArcFace Genuine vs Impostor Similarity Scores")

plt.xlabel("Similarity Score")

plt.ylabel("Number of Comparisons")


plt.legend()

plt.grid(True, alpha=0.3)

plt.tight_layout()


# Save high-resolution image
plt.savefig(
    "arcface_score_distribution.png",
    dpi=300
)


plt.show()


print("\nGraph 2 generated successfully!")
