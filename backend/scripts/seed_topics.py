"""Seed (idempotent) question_topics from the slug rules in retrieval.py.

Run:
    python -m scripts.seed_topics
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import QuestionTopic  # noqa: E402


TOPICS = [
    ("python",            "Python",                "Cú pháp Python, list, dict, list comprehension, lambda"),
    ("pandas",            "Pandas",                "DataFrame, groupby, merge, pivot, đọc CSV"),
    ("numpy",             "NumPy",                 "ndarray, broadcasting, vectorization"),
    ("visualization",     "Visualization",         "Matplotlib, Seaborn, biểu đồ, scatter, heatmap"),
    ("linear-regression", "Linear Regression",     "Hồi quy tuyến tính, MSE, R²"),
    ("regression",        "Regression",            "Hồi quy tổng quát"),
    ("classification",    "Classification",        "Phân loại, logistic, confusion matrix, F1"),
    ("decision-tree",     "Decision Tree",         "Cây quyết định, Random Forest, Gini, Entropy"),
    ("neural-network",    "Neural Network",        "ANN, MLP, deep learning, perceptron"),
    ("cluster",           "Cluster Analysis",      "K-means, DBSCAN, phân cụm, silhouette"),
    ("association",       "Association Rule",      "Apriori, support, confidence, lift, market basket"),
    ("text-mining",       "Text Mining",           "TF-IDF, NLP, tokenization, stopword"),
    ("web-mining",        "Web Mining",            "Scraping, crawling, PageRank"),
    ("big-data",          "Big Data",              "Hadoop, Spark, MapReduce, dữ liệu lớn"),
    ("data-warehouse",    "Data Warehouse",        "ETL, OLAP, dimensional model, star schema"),
    ("data-mining",       "Data Mining",           "Khai phá dữ liệu, KDD"),
    ("eda",               "EDA",                   "Khám phá dữ liệu, outlier, missing value"),
    ("business-intel",    "Business Intelligence", "BI, KPI, dashboard"),
]


def main() -> None:
    db = SessionLocal()
    try:
        existing = {
            t.slug for t in db.execute(select(QuestionTopic)).scalars().all()
        }
        n_new = 0
        for slug, name, desc in TOPICS:
            if slug in existing:
                continue
            db.add(QuestionTopic(slug=slug, name=name, description=desc))
            n_new += 1
        db.commit()
        total = db.execute(select(QuestionTopic)).scalars().all()
        print(f"Seeded {n_new} new topics. Total now: {len(total)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
