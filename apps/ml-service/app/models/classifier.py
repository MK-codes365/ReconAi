import numpy as np

class PureLogisticRegressionModel:
    """Pure numpy Logistic Regression classifier for high-speed robust execution"""
    def __init__(self, lr=0.05, iterations=1500):
        self.lr = lr
        self.iterations = iterations
        self.weights = None
        self.bias = None

    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0.0

        self.mean = np.mean(X, axis=0)
        self.std = np.std(X, axis=0) + 1e-8
        X_norm = (X - self.mean) / self.std

        for _ in range(self.iterations):
            linear_model = np.dot(X_norm, self.weights) + self.bias
            y_pred = 1 / (1 + np.exp(-np.clip(linear_model, -20, 20)))

            dw = (1 / n_samples) * np.dot(X_norm.T, (y_pred - y))
            db = (1 / n_samples) * np.sum(y_pred - y)

            self.weights -= self.lr * dw
            self.bias -= self.lr * db

    def predict_proba(self, X):
        X_norm = (X - self.mean) / self.std
        linear_model = np.dot(X_norm, self.weights) + self.bias
        probs = 1 / (1 + np.exp(-np.clip(linear_model, -20, 20)))
        return np.column_stack((1 - probs, probs))
