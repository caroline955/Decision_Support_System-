"""Seed lessons with hand-curated Data Science content.

Use this when the PDF is corrupt or unavailable. Each lesson has rich
text (~1500-2500 chars) so the A+ keyword retrieval can score meaningfully.

Run:
    python -m scripts.seed_lessons
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Course, Lesson  # noqa: E402


LESSONS_DS101 = [
    (
        "Python cơ bản cho Data Science",
        """Python là ngôn ngữ phổ biến nhất trong Data Science. Bài học giới thiệu các khái niệm cốt lõi:
biến, kiểu dữ liệu (int, float, str, bool), cấu trúc dữ liệu (list, tuple, dict, set), điều kiện if/else,
vòng lặp for/while, hàm def, list comprehension. List comprehension dạng [expr for x in iterable if cond]
giúp viết code ngắn gọn và thường nhanh hơn vòng lặp for thường khoảng 30%.
Ví dụ: squares = [x*x for x in range(10) if x % 2 == 0].
Lambda function: lambda x: x + 1 dùng cho map, filter, sorted key.
Kiểu dict rất quan trọng cho Data Science vì cấu trúc DataFrame của Pandas dựa trên dict-of-arrays.
Modules cần thuộc: os, sys, datetime, json, re, collections (Counter, defaultdict), itertools.""",
    ),
    (
        "NumPy — Mảng số học hiệu năng cao",
        """NumPy là nền tảng cho mọi thư viện khoa học dữ liệu trong Python. Cốt lõi là ndarray (n-dimensional array)
được lưu liền kề trong bộ nhớ, nhanh hơn list Python hàng chục lần.
Tạo mảng: np.array([1,2,3]), np.zeros((3,3)), np.ones, np.arange, np.linspace, np.random.randn.
Indexing: arr[0], arr[-1], arr[1:5], arr[:, 0] (cột 0), arr[arr > 5] (boolean masking).
Broadcasting: arr1 + arr2 thực hiện elementwise dù shape khác nhau theo quy tắc broadcast.
Vectorization: thay vì viết for loop hãy dùng np.sum, np.mean, np.std, np.dot — nhanh hơn nhiều.
Phép toán ma trận: A @ B là matrix multiplication, np.linalg.inv, np.linalg.eig.
Hàm thống kê: np.mean, np.median, np.std, np.var, np.percentile, np.corrcoef.""",
    ),
    (
        "Pandas DataFrame — Đọc, lọc, biến đổi dữ liệu",
        """Pandas là thư viện trung tâm cho thao tác dữ liệu bảng. Hai class chính: Series (1 chiều) và DataFrame (2 chiều).
Đọc dữ liệu: pd.read_csv("file.csv", encoding="utf-8-sig") cho file Excel xuất ra; encoding="cp1258" cho file Việt cũ;
sep="\\t" cho TSV; quotechar='"' để xử lý cell có dấu phẩy. Đọc Excel: pd.read_excel.
Khám phá: df.head(), df.tail(), df.info(), df.describe(), df.shape, df.dtypes, df.columns, df.isnull().sum().
Truy cập cột: df["col"], df[["col1","col2"]]. Truy cập hàng: df.loc[label], df.iloc[0:5].
Lọc: df[df["age"] > 18], df.query("age > 18 and city == 'HN'").
Thêm cột: df["new"] = df["a"] + df["b"]. df.apply(func, axis=1) áp dụng theo từng hàng.
Xử lý missing: df.dropna(), df.fillna(0), df.fillna(df.mean()).
Đổi tên: df.rename(columns={"old":"new"}). Đổi kiểu: df["x"].astype(int).""",
    ),
    (
        "Pandas — Group By và Pivot Table",
        """GroupBy là công cụ mạnh nhất của Pandas, lấy cảm hứng từ split-apply-combine.
Cú pháp: df.groupby("city")["sales"].sum() chia theo city, lấy cột sales, tính tổng mỗi nhóm.
Đa cột: df.groupby(["city","year"])["sales"].agg(["sum","mean","count"]).
Hàm agg trả về 1 giá trị cho mỗi nhóm. Hàm transform giữ nguyên shape gốc, hữu ích cho normalize:
df["sales_norm"] = df.groupby("city")["sales"].transform(lambda x: (x - x.mean()) / x.std()).
Hàm filter: df.groupby("city").filter(lambda g: len(g) > 10) giữ các nhóm có trên 10 dòng.
Khác với pivot_table: pd.pivot_table(df, values="sales", index="city", columns="year", aggfunc="sum")
cho phép aggregate theo cả hàng và cột, kết quả là bảng wide-format.
Merge/join: pd.merge(df1, df2, on="user_id", how="left"). how có 4 giá trị: inner, left, right, outer.
Concat: pd.concat([df1, df2]) nối theo trục. Giống SQL UNION.""",
    ),
    (
        "Visualization — Matplotlib và Seaborn",
        """Matplotlib là nền của visualization trong Python. Cấu trúc cơ bản: figure -> axes -> plot.
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(8,4))
ax.plot(x, y, color="steelblue", linewidth=2, label="trend")
ax.set_title("Doanh thu"), ax.set_xlabel("Tháng"), ax.set_ylabel("Triệu VND")
ax.legend(), plt.tight_layout(), plt.show()
Các loại biểu đồ: plt.plot (line), plt.scatter (scatter), plt.bar (bar), plt.hist (histogram, bins=20),
plt.boxplot (box), plt.pie (pie). Multi-subplot: fig, axes = plt.subplots(2, 2).
Đổi màu histogram: plt.hist(data, bins=20, color="steelblue", edgecolor="white").
Seaborn là wrapper đẹp hơn: sns.histplot, sns.boxplot, sns.scatterplot, sns.heatmap (cho correlation matrix),
sns.pairplot (scatter matrix), sns.regplot (scatter + regression line).
Chuẩn EDA: histogram + boxplot cho mỗi biến số, heatmap correlation cho toàn bộ.""",
    ),
    (
        "EDA — Phân tích khám phá dữ liệu",
        """Exploratory Data Analysis là bước đầu tiên của mọi dự án DS, theo phương pháp luận của John Tukey.
Quy trình EDA chuẩn:
1. Hiểu cấu trúc: df.shape, df.dtypes, df.info(). Bao nhiêu hàng, cột, kiểu gì?
2. Thống kê mô tả: df.describe() cho mean, std, min, max, percentile.
3. Missing values: df.isnull().sum() — quyết định fillna, dropna, hay impute bằng KNN.
4. Distribution của target: histogram hoặc countplot. Phát hiện skewness, outlier.
5. Distribution của feature: boxplot phát hiện outlier (giá trị nằm ngoài Q1 - 1.5*IQR và Q3 + 1.5*IQR).
6. Tương quan: df.corr() rồi sns.heatmap. Pearson cho liên tục, Spearman cho thứ tự.
7. Biến phân loại: value_counts, crosstab pd.crosstab(df.x, df.y), chi-squared test.
8. Visualization đa biến: pairplot, scatter color theo class, FacetGrid.
Outlier: dùng z-score (>3) hoặc IQR. Có thể loại bỏ hoặc winsorize (cap về percentile).""",
    ),
]


LESSONS_DS201 = [
    (
        "Linear Regression — Hồi quy tuyến tính",
        """Linear Regression giả định y = w0 + w1*x1 + ... + wn*xn + ε. Mục tiêu tìm w để minimize MSE
(Mean Squared Error) = (1/n) * Σ(y_pred - y_true)^2.
Sklearn: from sklearn.linear_model import LinearRegression
model = LinearRegression().fit(X_train, y_train)
y_pred = model.predict(X_test)
print(model.coef_, model.intercept_)
Đánh giá: from sklearn.metrics import r2_score, mean_squared_error
R² đo phần phương sai giải thích được. R² = 1 hoàn hảo, R² = 0 ngang baseline mean.
R² ÂM nghĩa là model còn tệ hơn baseline — thường do feature không có tín hiệu hoặc data leakage ngược.
Giả định LinReg: tuyến tính, độc lập, phương sai đồng nhất (homoscedasticity), normal residuals.
Vi phạm phổ biến: multicollinearity (giải bằng VIF, hoặc dùng Ridge/Lasso).
Regularization: Ridge L2 (penalty Σwi²), Lasso L1 (Σ|wi|, có thể bằng 0 nên feature selection).
Chuẩn hoá feature trước khi regularize: from sklearn.preprocessing import StandardScaler.""",
    ),
    (
        "Logistic Regression và Classification",
        """Logistic Regression dùng cho phân loại nhị phân, dự đoán P(y=1|x) qua sigmoid σ(z) = 1/(1+e^-z).
Loss là cross-entropy: -[y*log(p) + (1-y)*log(1-p)]. Sklearn: LogisticRegression(C=1.0, penalty='l2').
C là nghịch đảo regularization strength: C nhỏ = regularize mạnh = ít overfit.
Đánh giá classification:
- Accuracy: (TP+TN)/total — thiên vị khi class imbalanced.
- Precision = TP/(TP+FP) — trong số dự đoán positive, bao nhiêu đúng.
- Recall = TP/(TP+FN) — trong số positive thật sự, bắt được bao nhiêu.
- F1 = 2*P*R/(P+R) — trung bình điều hoà.
- ROC-AUC: diện tích dưới đường ROC, robust với threshold.
Confusion matrix: from sklearn.metrics import confusion_matrix, classification_report
cm = confusion_matrix(y_true, y_pred). Hàng = thực tế, cột = dự đoán.
Multi-class: One-vs-Rest hoặc Softmax (multinomial).
Cải thiện: oversample SMOTE, undersample, hoặc đặt class_weight='balanced'.
Train-test split: from sklearn.model_selection import train_test_split, stratify=y giữ tỉ lệ class.""",
    ),
]


def main() -> None:
    db = SessionLocal()
    try:
        ds101 = db.execute(select(Course).where(Course.code == "DS101")).scalar_one_or_none()
        ds201 = db.execute(select(Course).where(Course.code == "DS201")).scalar_one_or_none()
        if not ds101 or not ds201:
            print("Course DS101/DS201 not found. Run seed.sql first.")
            return

        # clear and re-insert
        db.query(Lesson).filter(Lesson.course_id.in_([ds101.id, ds201.id])).delete(
            synchronize_session=False
        )
        db.commit()

        for i, (title, content) in enumerate(LESSONS_DS101, start=1):
            db.add(Lesson(course_id=ds101.id, title=title, content=content,
                          order_index=i, file_url="curated"))
        for i, (title, content) in enumerate(LESSONS_DS201, start=1):
            db.add(Lesson(course_id=ds201.id, title=title, content=content,
                          order_index=i, file_url="curated"))
        db.commit()
        print(f"Seeded {len(LESSONS_DS101)} DS101 + {len(LESSONS_DS201)} DS201 lessons.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
