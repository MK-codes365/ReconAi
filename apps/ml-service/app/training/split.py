import pandas as pd
import numpy as np
from app.features.builder import build_feature_vector

def prepare_splits(df: pd.DataFrame, train_ratio=0.70, val_ratio=0.15, random_seed=42):
    np.random.seed(random_seed)
    
    # Shuffle dataset
    df_shuffled = df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)
    
    X_list = []
    y_list = []
    
    for _, row in df_shuffled.iterrows():
        feat_dict = row.to_dict()
        vec = build_feature_vector(feat_dict)
        X_list.append(vec.flatten())
        y_list.append(row["recovered"])
        
    X = np.array(X_list)
    y = np.array(y_list)
    
    n_total = len(X)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)
    
    X_train, y_train = X[:n_train], y[:n_train]
    X_val, y_val = X[n_train:n_train+n_val], y[n_train:n_train+n_val]
    X_test, y_test = X[n_train+n_val:], y[n_train+n_val:]
    
    return X_train, y_train, X_val, y_val, X_test, y_test
