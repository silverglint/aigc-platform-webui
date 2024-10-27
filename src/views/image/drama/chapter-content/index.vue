<script setup lang="ts">
import {onMounted, onUnmounted, provide, ref, watch} from "vue";
import {useRoute} from "vue-router";
import useLoading from "@/hooks/loading.ts";
import TableContent from "./components/TableContent.vue";
import CommonRole from "./components/CommonRole.vue";
import TextRole from "./components/TextRole.vue";
import {Message} from "@arco-design/web-vue";
import {getTextChapter, ImageContentConfig, ImageDrama, roleInference, stopCreateAudio} from "@/api/image-chapter.ts";
import {EventTypes, TextProjectType} from "@/types/global.ts";
import AudioPreview from "@/views/image/drama/chapter-content/components/AudioPreview.vue";
import {getImageProject, ImageProject} from "@/api/image-project.ts";
import ChapterEditModal from "@/views/image/drama/chapter-title/components/ChapterEditModal.vue";
import GlobalWebsocketService from "@/services/globalWebsocketService.ts";
import emitter from "@/mitt";
import RoleInferenceModal from "@/views/image/drama/chapter-content/components/RoleInferenceModal.vue";
import ImagePromptInferenceModal from "@/views/image/drama/chapter-content/components/ImagePromptInferenceModal.vue";

const route = useRoute();
const {loading, setLoading} = useLoading();

const emits = defineEmits(['refresh']);

const selectedIndexes = ref<string[]>([])
const imageContentConfig = ref<ImageContentConfig>({} as ImageContentConfig)
const audioPreviewModelVisible = ref<boolean>(false);
const chapterEditModalVisible = ref<boolean>(false);
const roleInferenceModalVisible = ref<boolean>(false);
const imagePromptInferenceModalVisible = ref<boolean>(false);
const playStartIndex = ref<string>('')

const tableContentRef = ref<
    {
      playAllAudio: Function,
      handleSelectAllValue: Function,
      handleConditionSelect: Function,
      handleImageGenerate: Function,

      handleBatchRoleChange: Function,
      handleBatchModelChange: Function,
      handleAudioParamsChange: Function,
      handleCombineExport: Function,
      handleMarkupDialogue: Function,
      handleBatchDelete: Function,
    } | null
>(null);

const refresh = () => {
  emitter?.emit(EventTypes.chapter_info_refresh);
}

const aiResultText = ref<string>('')

const handleAiInferenceMessage = (data: string[], index: number) => {
  aiResultText.value += data.join('');
  console.log('Received data chunk', data.join(''), 'at index', index);
};

const handleAiInferenceDone = () => {
  setLoading(false);
  setTimeout(() => {
    refresh();
  }, 500)
  console.log('Request done\n', aiResultText.value);
};

const handleAiInferenceError = async (response: Response) => {
  setLoading(false);
  const errorBody = await response.json();
  if (response.status === 401) {
    Message.error(errorBody.error);
  } else if (response.status === 400) {
    Message.error(errorBody.error);
  } else {
    Message.error('Unexpected error occurred');
  }
};

const handleAiInferenceTimeout = () => {
  setLoading(false);
  console.error('Request timed out');
};

const handleAiInference = (param: any) => {
  try {
    setLoading(true);
    roleInference(
        '/api/sse/imageDrama/roleInference',
        {
          projectId: route.query.projectId as string,
          chapterId: route.query.chapterId as string,
          ...param,
        },
        handleAiInferenceMessage,
        handleAiInferenceDone,
        handleAiInferenceError,
        handleAiInferenceTimeout
    )
    aiResultModalVisible.value = false;
  } catch (err) {
    setLoading(false);
  }
};

const handleImageInference = (param: any) => {
  try {
    setLoading(true);
    roleInference(
        '/api/sse/imageDrama/promptInference',
        {
          projectId: route.query.projectId as string,
          chapterId: route.query.chapterId as string,
          ...param,
        },
        handleAiInferenceMessage,
        handleAiInferenceDone,
        handleAiInferenceError,
        handleAiInferenceTimeout
    )
    aiResultModalVisible.value = false;
  } catch (err) {
    setLoading(false);
  }
};

const aiResultModalVisible = ref<boolean>(false);

const onStartCreateImage = (actionType: 'all' | 'modified' | 'selected') => {
  tableContentRef.value?.handleImageGenerate(actionType)
}

const stopLoading = ref<boolean>(false);
const handleStopCreateAudio = async () => {
  await stopCreateAudio();
  stopLoading.value = true;
}

provide('GlobalWebsocketService', GlobalWebsocketService);

const taskNum = ref(0);
const creatingIds = ref<string[]>([])
const wsDataHandler = (data: any) => {
  taskNum.value = data?.taskNum ?? 0;
  creatingIds.value = data?.creatingIds ?? [];
  if (data?.taskNum ?? 0 === 0) {
    stopLoading.value = false;
  }
}

const textProject = ref<ImageProject | null>(null)
const textChapter = ref<ImageDrama | null>(null)

const handleQueryProject = async () => {
  const {data} = await getImageProject({
    projectId: route.query.projectId as string,
  })
  textProject.value = data
}

const handleQueryChapter = async () => {
  const {data} = await getTextChapter({
    projectId: route.query.projectId as string,
    chapterId: route.query.chapterId as string,
  })
  textChapter.value = data
}

const handleAudioCombineEvent = () => {
  handleQueryChapter();
}

onMounted(() => {
  emitter?.on(EventTypes.chapter_refresh, handleAudioCombineEvent);
  emitter?.on(EventTypes.audio_generate_summary, wsDataHandler);
});

onUnmounted(() => {
  emitter?.off(EventTypes.chapter_refresh, handleAudioCombineEvent);
  emitter?.off(EventTypes.audio_generate_summary, wsDataHandler);
});

watch(
    () => route.query.chapterId,
    () => {
      selectedIndexes.value = [];
      if (route.query.chapterId) {
        handleQueryProject();
        handleQueryChapter();
      }
    },
    {immediate: true}
);
</script>

<template>
  <div>
    <a-affix>
      <div class="text-space-header" style="border-bottom: 1px solid rgb(229,230,235)">
        <div style="width: 90%; display: flex">
          <a-space size="large" align="start">
            <div v-if="route.query.projectType === TextProjectType.short_text">
              <a-button type="primary"
                        size="small"
                        @click="chapterEditModalVisible = true">
                章节编辑
              </a-button>
            </div>
            <div v-if="textProject?.projectType !== TextProjectType.format_text">
              <a-button type="primary"
                        :loading="loading"
                        size="small"
                        @click="() => (roleInferenceModalVisible = true)">
                角色推理
              </a-button>
            </div>
            <div>
              <a-button type="primary"
                        :loading="loading"
                        size="small"
                        @click="() => (imagePromptInferenceModalVisible = true)">
                图片提示词
              </a-button>
            </div>
            <div>
              <a-dropdown-button type="primary"
                                 size="small">
                图片生成
                <template #icon>
                  <icon-down/>
                </template>
                <template #content>
                  <a-doption @click="onStartCreateImage('all')">
                    全部重新生成
                  </a-doption>
                  <a-doption @click="onStartCreateImage('modified')">
                    修改部分生成
                  </a-doption>
                  <a-doption @click="onStartCreateImage('selected')">
                    生成选中部分
                  </a-doption>
                </template>
              </a-dropdown-button>
            </div>
            <div>
              <a-button-group>
                <a-button
                    size="small"
                    type="primary"
                    :status="imageContentConfig.edit ? 'warning' : 'normal'"
                    @click="() => {
                      if (imageContentConfig.edit) {
                        tableContentRef?.handleSelectAllValue(false)
                      }
                      imageContentConfig.edit = !imageContentConfig.edit
                    }"
                >
                  {{ imageContentConfig.edit ? '关闭编辑' : '编辑模式' }}
                </a-button>
                <a-dropdown
                    v-if="imageContentConfig.edit"
                    position="br"
                >
                  <a-button
                      type="primary"
                      size="small"
                  >
                    <template #icon>
                      <icon-down/>
                    </template>
                  </a-button>
                  <template #content>
                    <a-doption @click="tableContentRef?.handleSelectAllValue(true)">
                      全选
                    </a-doption>
                    <a-doption @click="tableContentRef?.handleConditionSelect(true)">
                      条件选择
                    </a-doption>
                    <a-doption @click="tableContentRef?.handleSelectAllValue(false)">
                      取消全选
                    </a-doption>
                  </template>
                </a-dropdown>
              </a-button-group>
            </div>
            <div v-if="imageContentConfig.edit">
              <a-dropdown-button
                  type="primary"
                  size="small"
              >
                批量处理
                <template #icon>
                  <icon-down/>
                </template>
                <template #content>
                  <a-doption
                      style="margin-right: 5px"
                      @click="tableContentRef?.handleBatchRoleChange()"
                  >
                    角色修改
                  </a-doption>
                  <a-doption @click="tableContentRef?.handleBatchModelChange()">
                    模型修改
                  </a-doption>
                  <a-doption @click="tableContentRef?.handleAudioParamsChange()">
                    音频参数
                  </a-doption>
                  <a-doption @click="tableContentRef?.handleCombineExport()">
                    合并导出
                  </a-doption>
                </template>
              </a-dropdown-button>
            </div>
            <div v-if="taskNum">
              <a-space>
                <span>任务队列: {{ taskNum }}</span>
                <a-button
                    size="small"
                    status="danger"
                    :loading="stopLoading"
                    @click="handleStopCreateAudio">
                  停止
                </a-button>
              </a-space>
            </div>
          </a-space>
        </div>
      </div>
    </a-affix>
    <div style="display: flex; margin-top: 10px">
      <div style="flex: 1"
           :style="route.query.projectType as string === TextProjectType.long_text && {marginLeft: '10px'}">
        <a-scrollbar style="max-height: calc(100vh - 90px); padding-right: 10px; overflow: auto">
          <table-content ref="tableContentRef"
                         v-model:image-content-config="imageContentConfig"
                         v-model:selected-indexes="selectedIndexes"
                         v-model:creating-ids="creatingIds"/>
        </a-scrollbar>
      </div>
      <a-divider direction="vertical" style="margin: 0"/>
      <div style="width: 15%; margin-left: 10px">
        <a-scrollbar style="max-height: calc(100vh - 90px); overflow: auto">
          <a-card :bordered="false" style="border-radius: 8px" :body-style="{ padding: '0 10px 0 0' }">
            <n-tabs default-value="1"
                    justify-content="space-evenly"
                    type="line">
              <n-tab-pane name="1"
                          tab="文中角色"
                          display-directive="show:lazy">
                <text-role/>
              </n-tab-pane>
              <n-tab-pane name="2"
                          tab="预置角色"
                          display-directive="show:lazy">
                <common-role/>
              </n-tab-pane>
            </n-tabs>
          </a-card>
        </a-scrollbar>
      </div>
    </div>
    <role-inference-modal
        v-model:visible="roleInferenceModalVisible"
        @success="handleAiInference"/>
    <image-prompt-inference-modal
        v-model:visible="imagePromptInferenceModalVisible"
        @success="handleImageInference"/>
    <audio-preview v-model:visible="audioPreviewModelVisible"/>
    <chapter-edit-modal
        v-model:visible="chapterEditModalVisible"
        :chapter-id="route.query.chapterId as string"/>
  </div>
</template>

<style scoped>

.text-space-header {
  width: 100%;
  height: 40px;
  display: flex;
  justify-content: center;
}

</style>
