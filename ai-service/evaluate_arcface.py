import base64
import csv
from pathlib import Path
from PIL import Image

from face_module import run_face_verification


# ============================================================
# CONFIGURATION
# ============================================================

AI_SERVICE_DIR = Path(__file__).resolve().parent

DATASET_DIR = (
    AI_SERVICE_DIR.parent.parent
    / "face_test_dataset"
    / "Selfie & id data - public sample"
)

PEOPLE = [str(i) for i in range(1, 11)]

THRESHOLDS = [
    0.50,
    0.55,
    0.60,
    0.61,
    0.62,
    0.63,
    0.64,
    0.65,
    0.70,
]


# ============================================================
# IMAGE HELPERS
# ============================================================

def image_to_base64(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def is_valid_image(image_path):
    try:
        with Image.open(image_path) as img:
            img.verify()
        return True
    except Exception:
        return False


def get_images(person, folder):
    folder_path = DATASET_DIR / person / folder

    if not folder_path.exists():
        return []

    return sorted([
        p
        for p in folder_path.iterdir()
        if p.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ])


def compare(document_path, selfie_path):

    try:
        document_b64 = image_to_base64(document_path)
        selfie_b64 = image_to_base64(selfie_path)

        return run_face_verification(
            document_b64,
            selfie_b64
        )

    except Exception as e:

        print(f"ERROR: {e}")

        return {
            "similarity": 0.0,
            "match": False,
            "doc_face_detected": False,
            "live_face_detected": False,
        }


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 80)
    print("             ArcFace FULL PAIR EVALUATION")
    print("=" * 80)

    print("\nDataset:")
    print(DATASET_DIR)

    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    documents = {}
    selfies = {}

    for person in PEOPLE:

        docs = get_images(person, "docs")
        self_imgs = get_images(person, "selfies")

        if docs:
            documents[person] = docs[0]

        if self_imgs:
            selfies[person] = self_imgs

    print("\nDataset overview:")

    for person in PEOPLE:

        doc_status = "YES" if person in documents else "NO"
        selfie_count = len(selfies.get(person, []))

        print(
            f"Person {person}: "
            f"Document={doc_status}, "
            f"Selfies={selfie_count}"
        )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    results = []

    # ========================================================
    # 1. GENUINE COMPARISONS
    # ========================================================

    print("\n")
    print("=" * 80)
    print("                     GENUINE COMPARISONS")
    print("=" * 80)

    for person in PEOPLE:

        if person not in documents:
            continue

        if person not in selfies:
            continue

        document = documents[person]

        for selfie in selfies[person]:

            print(
                f"P{person} → P{person} "
                f"{selfie.name:10}",
                end=" "
            )

            # Validate images
            if not is_valid_image(document):

                print("INVALID DOCUMENT ❌")

                results.append({
                    "type": "genuine",
                    "document_person": person,
                    "selfie_person": person,
                    "document": document.name,
                    "selfie": selfie.name,
                    "similarity": "",
                    "status": "invalid_document",
                })

                continue

            if not is_valid_image(selfie):

                print("INVALID SELFIE ❌")

                results.append({
                    "type": "genuine",
                    "document_person": person,
                    "selfie_person": person,
                    "document": document.name,
                    "selfie": selfie.name,
                    "similarity": "",
                    "status": "invalid_selfie",
                })

                continue

            result = compare(document, selfie)

            if not result["doc_face_detected"]:

                print("DOCUMENT FACE NOT DETECTED ❌")

                results.append({
                    "type": "genuine",
                    "document_person": person,
                    "selfie_person": person,
                    "document": document.name,
                    "selfie": selfie.name,
                    "similarity": result["similarity"],
                    "status": "no_document_face",
                })

                continue

            if not result["live_face_detected"]:

                print("SELFIE FACE NOT DETECTED ❌")

                results.append({
                    "type": "genuine",
                    "document_person": person,
                    "selfie_person": person,
                    "document": document.name,
                    "selfie": selfie.name,
                    "similarity": result["similarity"],
                    "status": "no_selfie_face",
                })

                continue

            similarity = result["similarity"]

            print(
                f"Similarity: {similarity:.4f}"
            )

            results.append({
                "type": "genuine",
                "document_person": person,
                "selfie_person": person,
                "document": document.name,
                "selfie": selfie.name,
                "similarity": similarity,
                "status": "valid",
            })

    # ========================================================
    # 2. ALL IMPOSTOR COMPARISONS
    # ========================================================

    print("\n")
    print("=" * 80)
    print("                 ALL IMPOSTOR COMPARISONS")
    print("=" * 80)

    for document_person in PEOPLE:

        if document_person not in documents:
            continue

        document = documents[document_person]

        for selfie_person in PEOPLE:

            # Skip same person
            if selfie_person == document_person:
                continue

            if selfie_person not in selfies:
                continue

            for selfie in selfies[selfie_person]:

                print(
                    f"P{document_person} → P{selfie_person} "
                    f"{selfie.name:10}",
                    end=" "
                )

                # Validate document
                if not is_valid_image(document):

                    print("INVALID DOCUMENT ❌")

                    results.append({
                        "type": "impostor",
                        "document_person": document_person,
                        "selfie_person": selfie_person,
                        "document": document.name,
                        "selfie": selfie.name,
                        "similarity": "",
                        "status": "invalid_document",
                    })

                    continue

                # Validate selfie
                if not is_valid_image(selfie):

                    print("INVALID SELFIE ❌")

                    results.append({
                        "type": "impostor",
                        "document_person": document_person,
                        "selfie_person": selfie_person,
                        "document": document.name,
                        "selfie": selfie.name,
                        "similarity": "",
                        "status": "invalid_selfie",
                    })

                    continue

                result = compare(document, selfie)

                if not result["doc_face_detected"]:

                    print("DOCUMENT FACE NOT DETECTED ❌")

                    results.append({
                        "type": "impostor",
                        "document_person": document_person,
                        "selfie_person": selfie_person,
                        "document": document.name,
                        "selfie": selfie.name,
                        "similarity": result["similarity"],
                        "status": "no_document_face",
                    })

                    continue

                if not result["live_face_detected"]:

                    print("SELFIE FACE NOT DETECTED ❌")

                    results.append({
                        "type": "impostor",
                        "document_person": document_person,
                        "selfie_person": selfie_person,
                        "document": document.name,
                        "selfie": selfie.name,
                        "similarity": result["similarity"],
                        "status": "no_selfie_face",
                    })

                    continue

                similarity = result["similarity"]

                print(
                    f"Similarity: {similarity:.4f}"
                )

                results.append({
                    "type": "impostor",
                    "document_person": document_person,
                    "selfie_person": selfie_person,
                    "document": document.name,
                    "selfie": selfie.name,
                    "similarity": similarity,
                    "status": "valid",
                })

    # ========================================================
    # VALID RESULTS
    # ========================================================

    genuine = [
        r for r in results
        if r["type"] == "genuine"
        and r["status"] == "valid"
        and r["similarity"] != ""
    ]

    impostor = [
        r for r in results
        if r["type"] == "impostor"
        and r["status"] == "valid"
        and r["similarity"] != ""
    ]

    invalid = [
        r for r in results
        if r["status"] != "valid"
    ]

    # ========================================================
    # DATA SUMMARY
    # ========================================================

    print("\n")
    print("=" * 80)
    print("                         DATA SUMMARY")
    print("=" * 80)

    genuine_attempted = sum(
        r["type"] == "genuine"
        for r in results
    )

    impostor_attempted = sum(
        r["type"] == "impostor"
        for r in results
    )

    print("\nGenuine:")
    print(f"  Attempted : {genuine_attempted}")
    print(f"  Valid     : {len(genuine)}")
    print(f"  Invalid   : {genuine_attempted - len(genuine)}")

    print("\nImpostor:")
    print(f"  Attempted : {impostor_attempted}")
    print(f"  Valid     : {len(impostor)}")
    print(f"  Invalid   : {impostor_attempted - len(impostor)}")

    # ========================================================
    # SCORE STATISTICS
    # ========================================================

    if genuine:

        genuine_scores = [
            r["similarity"]
            for r in genuine
        ]

        print("\nGenuine scores:")
        print(
            f"  Minimum : {min(genuine_scores):.4f}"
        )
        print(
            f"  Maximum : {max(genuine_scores):.4f}"
        )
        print(
            f"  Average : "
            f"{sum(genuine_scores) / len(genuine_scores):.4f}"
        )

    if impostor:

        impostor_scores = [
            r["similarity"]
            for r in impostor
        ]

        print("\nImpostor scores:")
        print(
            f"  Minimum : {min(impostor_scores):.4f}"
        )
        print(
            f"  Maximum : {max(impostor_scores):.4f}"
        )
        print(
            f"  Average : "
            f"{sum(impostor_scores) / len(impostor_scores):.4f}"
        )

    # ========================================================
    # THRESHOLD ANALYSIS
    # ========================================================

    print("\n")
    print("=" * 80)
    print("                       THRESHOLD ANALYSIS")
    print("=" * 80)

    print(
        "\nThreshold | Genuine Accept | "
        "False Reject | Impostor Accept | False Accept | "
        "FAR % | FRR %"
    )

    print("-" * 80)

    threshold_results = []

    for threshold in THRESHOLDS:

        genuine_accept = sum(
            r["similarity"] >= threshold
            for r in genuine
        )

        genuine_reject = (
            len(genuine) - genuine_accept
        )

        impostor_accept = sum(
            r["similarity"] >= threshold
            for r in impostor
        )

        impostor_reject = (
            len(impostor) - impostor_accept
        )

        if genuine:
            frr = (
                genuine_reject / len(genuine)
            ) * 100
        else:
            frr = 0

        if impostor:
            far = (
                impostor_accept / len(impostor)
            ) * 100
        else:
            far = 0

        print(
            f"   {threshold:.2f}   |"
            f"      {genuine_accept:3d}/{len(genuine):3d}     |"
            f"     {genuine_reject:3d}     |"
            f"       {impostor_accept:3d}/{len(impostor):3d}       |"
            f"     {impostor_accept:3d}     |"
            f" {far:6.2f} |"
            f" {frr:6.2f}"
        )

        threshold_results.append({
            "threshold": threshold,
            "genuine_accept": genuine_accept,
            "genuine_reject": genuine_reject,
            "false_reject_rate_percent": frr,
            "impostor_accept": impostor_accept,
            "impostor_reject": impostor_reject,
            "false_accept_rate_percent": far,
        })

    # ========================================================
    # HIGHEST IMPOSTOR / LOWEST GENUINE
    # ========================================================

    if genuine and impostor:

        lowest_genuine = min(
            genuine,
            key=lambda x: x["similarity"]
        )

        highest_impostor = max(
            impostor,
            key=lambda x: x["similarity"]
        )

        print("\n")
        print("=" * 80)
        print("                    CRITICAL SCORES")
        print("=" * 80)

        print(
            "\nLowest genuine score:"
        )

        print(
            f"  P{lowest_genuine['document_person']} → "
            f"P{lowest_genuine['selfie_person']} "
            f"{lowest_genuine['selfie']}"
        )

        print(
            f"  Similarity = "
            f"{lowest_genuine['similarity']:.4f}"
        )

        print(
            "\nHighest impostor score:"
        )

        print(
            f"  P{highest_impostor['document_person']} → "
            f"P{highest_impostor['selfie_person']} "
            f"{highest_impostor['selfie']}"
        )

        print(
            f"  Similarity = "
            f"{highest_impostor['similarity']:.4f}"
        )

        gap = (
            lowest_genuine["similarity"]
            - highest_impostor["similarity"]
        )

        print(
            f"\nObserved separation gap = {gap:.4f}"
        )

    # ========================================================
    # INVALID FILES
    # ========================================================

    if invalid:

        print("\n")
        print("=" * 80)
        print("                       INVALID TESTS")
        print("=" * 80)

        for r in invalid:

            print(
                f"{r['type'].upper():8} "
                f"P{r['document_person']} → "
                f"P{r['selfie_person']} "
                f"{r['document']} + "
                f"{r['selfie']} "
                f"-> {r['status']}"
            )

    # ========================================================
    # SAVE DETAILED RESULTS
    # ========================================================

    output_file = Path(
        "arcface_full_pair_results.csv"
    )

    with open(
        output_file,
        "w",
        newline="",
        encoding="utf-8"
    ) as f:

        fieldnames = [
            "type",
            "document_person",
            "selfie_person",
            "document",
            "selfie",
            "similarity",
            "status",
        ]

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(results)

    # ========================================================
    # SAVE THRESHOLD RESULTS
    # ========================================================

    threshold_file = Path(
        "arcface_full_pair_thresholds.csv"
    )

    with open(
        threshold_file,
        "w",
        newline="",
        encoding="utf-8"
    ) as f:

        fieldnames = [
            "threshold",
            "genuine_accept",
            "genuine_reject",
            "false_reject_rate_percent",
            "impostor_accept",
            "impostor_reject",
            "false_accept_rate_percent",
        ]

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(threshold_results)

    # ========================================================
    # DONE
    # ========================================================

    print("\n")
    print("=" * 80)
    print("                         FILES SAVED")
    print("=" * 80)

    print(
        f"\nDetailed results:"
    )
    print(
        Path.cwd() / output_file
    )

    print(
        f"\nThreshold results:"
    )
    print(
        Path.cwd() / threshold_file
    )

    print("\nEvaluation complete! 🎯")


if __name__ == "__main__":
    main()