# 画像生成モデル選択機能 実装計画

## 目標

ComfyUI Reactアプリケーションにおいて、ユーザーが画像生成時に使用するチェックポイントモデルとLoRAモデルを任意に選択できるようにする。

## 計画の概要

以下のステップで実装を進める。

1. **API連携 (`src/services/api.ts`):**
    * ComfyUI APIの `/object_info` エンドポイントを呼び出し、指定されたノードタイプ (`CheckpointLoaderSimple`, `LoraLoader`) に対応する利用可能なモデルファイル名のリストを取得する関数 `getObjectInfo` を追加する。
    * `buildWorkflow` 関数を修正する。
        * 選択されたチェックポイント名 (`selectedCheckpoint: string`) とLoRA名 (`selectedLora: string | null`)、LoRA強度 (`loraStrength: number`) を引数として受け取るように変更する。
        * 引数で渡されたモデル名と強度をワークフロー定義に反映させる。
        * `selectedLora` が `null` でない場合、`LoraLoader` ノードを含むワークフローを構築し、そうでない場合は含まないワークフローを構築するロジックを追加する。

2. **状態管理 (`src/store/useAppStore.ts`):**
    * 利用可能なモデルリストを保持する状態を追加する:
        * `checkpointList: string[] = []`
        * `loraList: string[] = []`
    * ユーザーが選択したモデルと強度を保持する状態を追加する:
        * `selectedCheckpoint: string | null = null`
        * `selectedLora: string | null = null`
        * `loraStrength: number = 0.8` (デフォルト値)
    * `getObjectInfo` APIを呼び出してモデルリストを取得し、状態 (`checkpointList`, `loraList`) を更新するアクション `fetchModelLists` を追加する。
    * 選択されたモデル名と強度を更新するアクションを追加する:
        * `setSelectedCheckpoint(checkpoint: string | null)`
        * `setSelectedLora(lora: string | null)`
        * `setLoraStrength(strength: number)`

3. **フロントエンド (UI):**
    * `src/components/ParameterSettings.tsx` または新しいコンポーネント `src/components/ModelSelection.tsx` を作成または編集する。
    * アプリの初期化時（例: `App.tsx` の `useEffect`）に `fetchModelLists` アクションを呼び出す。
    * 状態管理から `checkpointList` と `loraList` を取得し、モデル選択用のUI（Select2を使用した検索可能なドロップダウンリストを推奨）をレンダリングする。LoRAのドロップダウンには "None" オプションを含める。
    * LoRA強度を設定するための数値入力フィールドを追加する。
    * 各UI要素の値が変更された際に、対応する状態更新アクション (`setSelectedCheckpoint`, `setSelectedLora`, `setLoraStrength`) を呼び出す。
    * 生成実行ボタンがクリックされた際 (`GenerateButton.tsx` など) に、API呼び出し (`processImage`) を行う。その際、状態管理から `selectedCheckpoint`, `selectedLora`, `loraStrength` を読み出し、引数として渡す。

## 計画図 (Mermaid)

```mermaid
graph TD
    subgraph フロントエンド (React)
        UI_Init[アプリ初期化] --> Action_FetchModels;
        UI_Select_Checkpoint[チェックポイント選択UI] -- 選択 --> Action_SetSelectedCheckpoint;
        UI_Select_LoRA[LoRA選択UI] -- 選択 --> Action_SetSelectedLoRA;
        UI_Input_LoRA_Strength[LoRA強度入力] -- 入力 --> Action_SetLoRAStrength;
        UI_Generate[生成ボタン] -- 実行 --> API_Call;
    end

    subgraph 状態管理 (Zustand - useAppStore.ts)
        State_ModelLists(モデルリスト<br/>checkpointList, loraList);
        State_SelectedModels(選択済みモデル<br/>selectedCheckpoint, selectedLora, loraStrength);
        Action_FetchModels(fetchModelLists アクション);
        Action_SetSelectedCheckpoint(setSelectedCheckpoint アクション);
        Action_SetSelectedLoRA(setSelectedLoRA アクション);
        Action_SetLoRAStrength(setLoraStrength アクション);

        Action_FetchModels --> API_GetObjectInfo;
        API_GetObjectInfo -- レスポンス --> Action_FetchModels;
        Action_FetchModels -- 更新 --> State_ModelLists;
        State_ModelLists --> UI_Select_Checkpoint;
        State_ModelLists --> UI_Select_LoRA;

        Action_SetSelectedCheckpoint -- 更新 --> State_SelectedModels;
        Action_SetSelectedLoRA -- 更新 --> State_SelectedModels;
        Action_SetLoRAStrength -- 更新 --> State_SelectedModels;
        State_SelectedModels --> API_Call;
    end

    subgraph バックエンド連携 (api.ts)
        API_GetObjectInfo(getObjectInfo 関数);
        API_BuildWorkflow(buildWorkflow 関数 - LoRA対応);
        API_Call(processImage 関数);

        API_GetObjectInfo --> ComfyAPI_ObjectInfo;
        API_Call -- 選択モデル/強度 --> API_BuildWorkflow;
        API_BuildWorkflow -- ワークフロー --> ComfyAPI_Prompt;
    end

    subgraph ComfyUIサーバー
        ComfyAPI_ObjectInfo(/object_info);
        ComfyAPI_Prompt(/prompt);
    end

    UI_Init;
    UI_Select_Checkpoint;
    UI_Select_LoRA;
    UI_Input_LoRA_Strength;
    UI_Generate;
```
