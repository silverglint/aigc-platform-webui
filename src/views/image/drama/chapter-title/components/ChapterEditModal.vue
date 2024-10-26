<script setup lang="ts">
import {ref, watch} from "vue";
import {useRoute} from "vue-router";
import {FileItem, FormInstance, Message} from "@arco-design/web-vue";
import {chapterEdit, getTextChapter, ImageDrama} from "@/api/image-chapter.ts";
import {ROLE_CHANGE} from "@/types/event-types.ts";
import emitter from "@/mitt";

const route = useRoute();
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  chapterId: {
    type: String
  }
});

const emits = defineEmits(['update:visible'])

const showModal = ref<boolean>(false);
const formRef = ref<FormInstance>()
const form = ref<ImageDrama & { validate: boolean }>({
  dialoguePattern: '',
  validate: false
} as any);

const file = ref<FileItem | null>(null);

const onChange = (_: FileItem[], fileItem: FileItem) => {
  file.value = {
    ...fileItem,
  };
};

const handleQueryChapterText = async () => {
  const {data} = await getTextChapter({
    projectId: route.query.projectId as string,
    chapterId: props.chapterId as string,
  })
  form.value = data as any;
}

const handleBeforeOk = async (done: (closed: boolean) => void) => {
  const res = await formRef.value?.validate();
  if (!res) {
    const {msg} = await chapterEdit(form.value);
    Message.success(msg);
    done(true);
    emitter?.emit(ROLE_CHANGE)
  } else {
    done(false);
  }
}

const close = () => {
  emits('update:visible', false);
}
watch(
    () => props.visible,
    () => {
      showModal.value = props.visible
      if (props.visible) {
        handleQueryChapterText()
        formRef.value?.resetFields();
      }
    },
    {immediate: true}
);
</script>

<template>
  <div>
    <a-modal
        v-model:visible="showModal"
        title="剧本编辑"
        :width="512"
        :unmount-on-close="true"
        @before-ok="handleBeforeOk"
        @close="close"
        @cancel="close"
    >
      <div style=" padding: 0 20px">
        <a-row :gutter="24">
          <a-col :span="24">
            <a-form
                ref="formRef"
                :model="form"
                size="small"
                :label-col-props="{ span: 5 }"
                :wrapper-col-props="{ span: 19 }"
            >
              <a-form-item label="章节标题" field="chapterName" required>
                <a-input v-model="form.chapterName"/>
              </a-form-item>
              <a-form-item label="字幕" required>
                <a-upload
                    :auto-upload="false"
                    :limit="1"
                    draggable
                    @change="onChange"
                />
              </a-form-item>
            </a-form>
          </a-col>
        </a-row>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>

</style>
