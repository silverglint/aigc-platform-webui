<script setup lang="ts">
import {PropType, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {FileItem, Message} from "@arco-design/web-vue";
import {dramaExpose, keyFrameConfig} from "@/api/image-chapter.ts";
import {EventTypes} from "@/types/global.ts";
import emitter from "@/mitt";

const route = useRoute();
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  chapterInfoIds: {
    type: Array as PropType<number[]>,
    default: []
  }
});
const emits = defineEmits(['update:visible']);

const showModal = ref(false)
const addKeyFrames = ref(false);
const keyframeConfig = ref<keyFrameConfig>({
  random: true,
  loop: [],
  scale: 1.2,
  left: -380,
  top: -280,
  right: 380,
  bottom: 280
});

const file = ref<FileItem | null>(null);

const onChange = (_: FileItem[], fileItem: FileItem) => {
  file.value = {
    ...fileItem,
  };
};

const handleBeforeOk = async (done: (closed: boolean) => void) => {
  const formData = new FormData();
  formData.append('file', file.value?.file as Blob);
  formData.append("dramaExport", new Blob([JSON.stringify({
    keyFramesConfig: keyframeConfig.value,
    projectId: route.query.projectId,
    chapterId: route.query.chapterId,
  })], {
    type: 'application/json'
  }))

  const {msg} = await dramaExpose(formData)
  Message.success(msg);
  emitter?.emit(EventTypes.chapter_refresh);
  done(true);
}

const close = () => {
  emits('update:visible', false);
}

watch(() => props.visible,
    () => {
      showModal.value = props.visible
    },
    {immediate: true}
)
</script>

<template>
  <div>
    <a-modal v-model:visible="showModal"
             title="导出剪映草稿"
             :unmount-on-close="true"
             :width="760"
             @before-ok="handleBeforeOk"
             @close="close"
             @cancel="close">
      <a-checkbox v-model="addKeyFrames">添加关键帧</a-checkbox>
      <a-space size="large" wrap>
        <a-input-number v-show="addKeyFrames" v-model="keyframeConfig.scale" :min="1" :max="5" :step="0.1"
                        :precision="1" style="width: 120px">
          <template #prefix>
            放大
          </template>
        </a-input-number>
        <a-input-number v-show="addKeyFrames" v-model="keyframeConfig.left" :min="-500" :max="500" :step="10"
                        :precision="0" style="width: 120px">
          <template #prefix>
            左移
          </template>
        </a-input-number>
        <a-input-number v-show="addKeyFrames" v-model="keyframeConfig.top" :min="-500" :max="500" :step="10"
                        :precision="0" style="width: 120px">
          <template #prefix>
            上移
          </template>
        </a-input-number>
        <a-input-number v-show="addKeyFrames" v-model="keyframeConfig.right" :min="-500" :max="500" :step="10"
                        :precision="0" style="width: 120px">
          <template #prefix>
            右移
          </template>
        </a-input-number>
        <a-input-number v-show="addKeyFrames" v-model="keyframeConfig.bottom" :min="-500" :max="500" :step="10"
                        :precision="0" style="width: 120px">
          <template #prefix>
            下移
          </template>
        </a-input-number>
        <a-checkbox v-show="addKeyFrames" v-model="keyframeConfig.random">随机</a-checkbox>
        <a-checkbox-group v-show="!keyframeConfig.random" v-model="keyframeConfig.loop">
          <a-checkbox value="1">放大</a-checkbox>
          <a-checkbox value="2">缩小</a-checkbox>
          <a-checkbox value="3">左移</a-checkbox>
          <a-checkbox value="4">右移</a-checkbox>
          <a-checkbox value="5">上移</a-checkbox>
          <a-checkbox value="6">下移</a-checkbox>
        </a-checkbox-group>
      </a-space>
      <a-upload tip="上传对话音频"
                :auto-upload="false"
                :limit="1"
                draggable
                @change="onChange"/>
    </a-modal>
  </div>
</template>

<style scoped>
</style>
